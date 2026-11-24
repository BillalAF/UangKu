import { ChatMessage } from "../../types";
import { apiRequest } from "./client";

/**
 * POST /api/chat
 * Pemanggilan Gemini dilakukan di server supaya API key tidak ikut terbawa ke aplikasi.
 * Jika server belum punya GEMINI_API_KEY, server membalas 503 dengan code "AI_NOT_CONFIGURED".
 */
export async function requestAiReply(params: {
  prompt: string;
  history: ChatMessage[];
  context: string;
}): Promise<string> {
  const { reply } = await apiRequest<{ reply: string }>("/chat", {
    method: "POST",
    body: {
      prompt: params.prompt,
      context: params.context,
      history: params.history.slice(-6).map((m) => ({ sender: m.sender, text: m.text })),
    },
    timeoutMs: 40000,
  });
  return reply;
}
