import type { OpenAISpeechRequest, MiMoRequest, OpenAIError } from "../../../lib/types.js";
import { mapVoice, getContentType, mapFormat, getSpeedInstruction } from "../../../lib/voices.js";
import { callMiMo, callMiMoStream, parseSSEStream, MiMoError } from "../../../lib/mimo.js";

export const config = {
  runtime: "edge",
};

function errorJson(message: string, status: number, type = "invalid_request_error"): Response {
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

declare const PROXY_API_KEY: string;
declare const MIMO_API_KEY: string;

function getEnv(name: string): string | undefined {
  try {
    return (process.env as Record<string, string | undefined>)[name];
  } catch {
    return undefined;
  }
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
    return errorJson("Method not allowed", 405);
  }

  const proxyKey = getEnv("PROXY_API_KEY");
  const mimoKey = getEnv("MIMO_API_KEY");

  if (!proxyKey || !mimoKey) {
    return errorJson("Server misconfigured: missing API keys", 500, "server_error");
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token || token !== proxyKey) {
    return errorJson("Invalid API key", 401, "invalid_api_key");
  }

  let body: OpenAISpeechRequest;
  try {
    body = await req.json();
  } catch {
    return errorJson("Invalid JSON body", 400);
  }

  if (!body.input) {
    return errorJson("Missing required field: input", 400);
  }

  const mimoReq = buildMiMoRequest(body);

  try {
    if (body.stream) {
      const mimoResp = await callMiMoStream(mimoReq, mimoKey);
      const reader = mimoResp.body!.getReader();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          let buffer = "";
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith("data: ")) continue;
                const data = trimmed.slice(6);
                if (data === "[DONE]") break;

                try {
                  const chunk = JSON.parse(data);
                  const audioData = chunk.choices?.[0]?.delta?.audio?.data;
                  if (audioData) {
                    const binary = Uint8Array.from(atob(audioData), (c) => c.charCodeAt(0));
                    controller.enqueue(binary);
                  }
                } catch {
                  // skip malformed chunks
                }
              }
            }
          } finally {
            reader.releaseLock();
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: { "Content-Type": getContentType(body.response_format) },
      });
    }

    const result = await callMiMo(mimoReq, mimoKey);
    const audioData = result.choices?.[0]?.message?.audio?.data;

    if (!audioData) {
      return errorJson("No audio data in MiMo response", 502, "server_error");
    }

    const audioBuffer = Uint8Array.from(atob(audioData), (c) => c.charCodeAt(0));
    return new Response(audioBuffer, {
      headers: { "Content-Type": getContentType(body.response_format) },
    });
  } catch (err: unknown) {
    if (err instanceof MiMoError) {
      return errorJson(`MiMo API error: ${err.body}`, err.status >= 500 ? 502 : err.status);
    }
    console.error("Unexpected error:", err);
    return errorJson("Internal server error", 500, "server_error");
  }
}
