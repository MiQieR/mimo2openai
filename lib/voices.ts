const OPENAI_ALIASES: Record<string, string> = {
  alloy: "mimo_default",
  echo: "苏打",
  fable: "茉莉",
  onyx: "白桦",
  nova: "冰糖",
  shimmer: "Mia",
  coral: "Chloe",
};

export function mapVoice(voice: string | undefined): string {
  if (!voice) return "mimo_default";
  return OPENAI_ALIASES[voice] || voice;
}

export function getContentType(format: string | undefined): string {
  switch (format) {
    case "mp3":
      return "audio/mpeg";
    case "opus":
      return "audio/opus";
    case "aac":
      return "audio/aac";
    case "flac":
      return "audio/flac";
    case "wav":
      return "audio/wav";
    case "pcm":
      return "audio/pcm";
    default:
      return "audio/wav";
  }
}

export function mapFormat(
  format: string | undefined
): "wav" | "pcm16" {
  if (format === "pcm") return "pcm16";
  return "wav";
}

export function getSpeedInstruction(speed: number | undefined): string {
  if (!speed || speed === 1) return "";
  if (speed <= 0.25) return "请非常缓慢地说话";
  if (speed <= 0.5) return "请缓慢地说话";
  if (speed <= 0.8) return "请稍慢地说话";
  if (speed <= 1.2) return "";
  if (speed <= 1.5) return "请稍快地说话";
  if (speed <= 2) return "请快速地说话";
  if (speed <= 3) return "请非常快速地说话";
  return "请以最快速度说话";
}
