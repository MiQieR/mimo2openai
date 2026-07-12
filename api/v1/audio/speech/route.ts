import type { OpenAISpeechRequest, MiMoRequest, OpenAIError } from "../../../../lib/types.js";
import { mapVoice, getContentType, mapFormat, getSpeedInstruction } from "../../../../lib/voices.js";
import { callMiMo, callMiMoStream, parseSSEStream, MiMoError } from "../../../../lib/mimo.js";

export const runtime = "edge";

function errorResponse(message: string, status: number, type = "invalid_request_error"): Response {
  const body: OpenAIError = {
    error: { message, type, param: null, code: null },
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buildMiMoRequest(body: OpenAISpeechRequest): MiMoRequest {
  const speedInstr = getSpeedInstruction(body.speed);
  const parts = [body.instructions, speedInstr].filter(Boolean);
  const userContent = parts.join("。");

  return {
    model: "mimo-v2.5-tts",
    messages: [
      { role: "user", content: userContent },
      { role: "assistant", content: body.input },
    ],
    audio: {
      format: mapFormat(body.response_format),
      voice: mapVoice(body.voice),
    },
  };
}

async function handleStreaming(mimoReq: MiMoRequest, apiKey: string, responseFormat: string | undefined): Promise<Response> {
  const mimoResp = await callMiMoStream(mimoReq, apiKey);
  const reader = mimoResp.body!.getReader();

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  (async () => {
    try {
      for await (const chunk of parseSSEStream(reader)) {
        const audioData = chunk.choices?.[0]?.delta?.audio?.data;
        if (audioData) {
          const binary = Uint8Array.from(atob(audioData), (c) => c.charCodeAt(0));
          await writer.write(binary);
        }
      }
    } catch (err) {
      console.error("Streaming error:", err);
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: { "Content-Type": getContentType(responseFormat) },
  });
}

async function handleNonStreaming(mimoReq: MiMoRequest, apiKey: string, responseFormat: string | undefined): Promise<Response> {
  const result = await callMiMo(mimoReq, apiKey);
  const audioData = result.choices?.[0]?.message?.audio?.data;

  if (!audioData) {
    return errorResponse("No audio data in MiMo response", 502, "server_error");
  }

  const audioBuffer = Uint8Array.from(atob(audioData), (c) => c.charCodeAt(0));

  return new Response(audioBuffer, {
    headers: { "Content-Type": getContentType(responseFormat) },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const authHeader = req.headers.get("Authorization");
  const apiKey = authHeader?.replace("Bearer ", "");
  if (!apiKey) {
    return errorResponse("Missing API key. Provide via Authorization: Bearer <key>", 401, "invalid_api_key");
  }

  let body: OpenAISpeechRequest;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  if (!body.input) {
    return errorResponse("Missing required field: input", 400);
  }

  const mimoReq = buildMiMoRequest(body);

  try {
    if (body.stream) {
      return await handleStreaming(mimoReq, apiKey, body.response_format);
    }
    return await handleNonStreaming(mimoReq, apiKey, body.response_format);
  } catch (err: unknown) {
    if (err instanceof MiMoError) {
      return errorResponse(`MiMo API error: ${err.body}`, err.status >= 500 ? 502 : err.status);
    }
    console.error("Unexpected error:", err);
    return errorResponse("Internal server error", 500, "server_error");
  }
}
