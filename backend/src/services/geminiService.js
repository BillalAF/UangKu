import dotenv from "dotenv";
import { SYSTEM_PROMPT } from "./prompts.js";

dotenv.config({ quiet: true });

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const THINKING_LEVEL = process.env.GEMINI_THINKING_LEVEL || "minimal";
const TIMEOUT_MS = 25000;

export class AiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function isAiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 5);
}

/**
 * Memanggil Gemini atas nama aplikasi. API key hanya ada di server (.env / env Vercel).
 * history : [{ sender: "user" | "bot", text }]  (maks 6 terakhir)
 * context : ringkasan kondisi keuangan terkini yang disusun aplikasi
 */
export async function generateReply({ prompt, history = [], context = "" }) {
  if (!isAiConfigured()) {
    throw new AiError("Asisten AI belum dikonfigurasi di server", "AI_NOT_CONFIGURED", 503);
  }

  const contents = [
    ...history.slice(-6).map((m) => ({
      role: m.sender === "user" ? "user" : "model",
      parts: [{ text: String(m.text ?? "") }],
    })),
    { role: "user", parts: [{ text: prompt }] },
  ];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: `${SYSTEM_PROMPT}\n\n${context}` }] },
        contents,
        thinking_config: { thinking_level: THINKING_LEVEL },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new AiError("Gagal menghubungi layanan AI: " + err.message, "AI_UNREACHABLE", 502);
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new AiError(
      errorBody?.error?.message || `Layanan AI mengembalikan HTTP ${response.status}`,
      "AI_UPSTREAM_ERROR",
      502
    );
  }

  const data = await response.json();
  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Maaf, tidak ada respon yang diterima dari asisten AI."
  );
}
