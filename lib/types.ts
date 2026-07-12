export interface OpenAISpeechRequest {
  model?: string;
  input: string;
  voice?: string;
  response_format?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
  speed?: number;
  instructions?: string;
  stream?: boolean;
}

export interface MiMoMessage {
  role: "user" | "assistant";
  content: string;
}

export interface MiMoRequest {
  model: string;
  messages: MiMoMessage[];
  audio: {
    format: "wav" | "pcm16";
    voice: string;
  };
  stream?: boolean;
}

export interface MiMoAudioData {
  data: string; // base64 encoded audio
}

export interface MiMoDelta {
  audio?: MiMoAudioData;
}

export interface MiMoChoice {
  delta: MiMoDelta;
}

export interface MiMoChunk {
  choices: MiMoChoice[];
}

export interface MiMoResponse {
  choices: {
    message: {
      audio: MiMoAudioData;
    };
  }[];
}

export interface OpenAIError {
  error: {
    message: string;
    type: string;
    param: string | null;
    code: string | null;
  };
}
