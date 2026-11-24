import { generateReply, AiError } from "../services/geminiService.js";

const MAX_PROMPT = 1000;
const MAX_CONTEXT = 4000;

export const ChatController = {
  async send(req, res) {
    try {
      const { prompt, history, context } = req.body || {};

      if (typeof prompt !== "string" || !prompt.trim()) {
        return res.status(400).json({ error: "prompt wajib diisi" });
      }
      if (prompt.length > MAX_PROMPT) {
        return res.status(400).json({ error: `prompt maksimal ${MAX_PROMPT} karakter` });
      }

      const safeHistory = Array.isArray(history)
        ? history
            .filter((m) => m && typeof m.text === "string")
            .slice(-6)
            .map((m) => ({ sender: m.sender === "user" ? "user" : "bot", text: m.text.slice(0, 2000) }))
        : [];

      const reply = await generateReply({
        prompt: prompt.trim(),
        history: safeHistory,
        context: typeof context === "string" ? context.slice(0, MAX_CONTEXT) : "",
      });

      res.json({ reply });
    } catch (err) {
      if (err instanceof AiError) {
        return res.status(err.status).json({ error: err.message, code: err.code });
      }
      res.status(500).json({ error: err.message });
    }
  },
};
