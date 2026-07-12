import type { MiMoRequest, MiMoResponse, MiMoChunk } from "./types.js";

const MIMO_API_URL = "https://api.xiaomimimo.com/v1/chat/completions";

export async function callMiMo(
  request: MiMoRequest,
  apiKey: string
): Promise<MiMoResponse> {
  const resp = await fetch(MIMO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(request),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new MiMoError(resp.status, text);
  }

  return resp.json() as Promise<MiMoResponse>;
}

export async function callMiMoStream(
  request: MiMoRequest,
  apiKey: string
): Promise<Response> {
  const resp = await fetch(MIMO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({ ...request, stream: true }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new MiMoError(resp.status, text);
  }

  return resp;
}

export class MiMoError extends Error {
  constructor(
    public status: number,
    public body: string
  ) {
    super(`MiMo API error ${status}: ${body}`);
    this.name = "MiMoError";
  }
}

export async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<MiMoChunk> {
  const decoder = new TextDecoder();
  let buffer = "";

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
      if (data === "[DONE]") return;
      try {
        yield JSON.parse(data) as MiMoChunk;
      } catch {
        // skip malformed chunks
      }
    }
  }
}
