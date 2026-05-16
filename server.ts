import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Groq from "groq-sdk";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

let genAI: GoogleGenAI | null = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API key is not set. Please check your Secrets panel in AI Studio.");
    }
    genAI = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return genAI;
}

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoint for Groq Whisper (STT)
  app.post("/api/stt", upload.single("audio"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      if (!process.env.GROQ_API_KEY) {
        return res.status(500).json({ error: "GROQ_API_KEY is missing." });
      }

      // Convert buffer to "file-like" object for Groq SDK
      // The SDK expects a real file or something with a name/path for mimetype detection usually
      const file = await Groq.toFile(req.file.buffer, req.file.originalname, { type: req.file.mimetype });

      const transcription = await groq.audio.transcriptions.create({
        file: file,
        model: "whisper-large-v3",
        response_format: "json",
        prompt: "A conversation in English and Czech. Rozhovor v angličtině a češtině.",
      });

      let text = transcription.text.trim();
      
      // Filter out common Whisper hallucinations and very low-value transcriptions
      const hallucinations = [
        "High quality transcription.",
        "Thank you.",
        "Thanks for watching.",
        "Please like and subscribe.",
        "Subtitle by",
        "Watching",
        "Bye bye",
        "You Tube",
        "Enjoy the video",
        "Thank you for watching.",
        "Transcribed by",
        "The end.",
        "English",
        "Titulky",
        "Český",
        "Děkuji za sledování.",
        "To je vše.",
        "Možnosti jsou omezené.",
        "Prezence",
        "High-quality",
        "Transcribe",
      ];
      
      const lowerText = text.toLowerCase();
      const isHallucination = hallucinations.some(h => lowerText.includes(h.toLowerCase()));
      
      if (isHallucination && text.length < 50) {
        text = "";
      }
      
      // Also catch very short single-word items that often occur in silence
      if (text.length > 0 && text.length < 4 && !/[a-zA-Z0-9]{4,}/.test(text)) {
         const commonNoise = ["oh", "uh", "ah", "i", "a", "it", "so"];
         if (commonNoise.includes(lowerText.replace(/[.,!?]/g, ""))) {
           text = "";
         }
      }

      res.json({ text: text });
    } catch (error: any) {
      console.error("Groq STT Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API endpoint for Groq TTS
  app.post("/api/tts", async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!process.env.GROQ_API_KEY) {
        return res.status(500).json({ error: "GROQ_API_KEY is missing." });
      }

      // @ts-ignore
      const response = await groq.audio.speech.create({
        model: "canopylabs/orpheus-v1-english",
        input: text,
        voice: "daniel", 
        response_format: "wav",
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      res.set("Content-Type", "audio/wav");
      res.send(buffer);
    } catch (error: any) {
      const code = error.error?.code || null;
      const status = error.status || 500;
      
      if (status === 429) {
        console.warn("Groq TTS Rate Limit reached. Falling back to browser TTS.");
        return res.status(429).json({ 
          error: "Rate limit reached", 
          code: "rate_limit_exceeded",
          message: "Please wait or use browser fallback"
        });
      }

      if (code === "model_terms_required") {
        // Log as info/warn instead of error to avoid cluttering logs
        console.warn("Groq TTS Model Terms required. Falling back to browser TTS.");
        return res.status(403).json({ 
          error: "Terms acceptance required", 
          code: "model_terms_required",
          link: "https://console.groq.com/playground?model=canopylabs%2Forpheus-v1-english"
        });
      }

      console.error("Groq TTS Error:", error);
      res.status(error.status || 500).json({ 
        error: error.message || "Failed to generate speech",
        details: error.error?.message || null,
        code
      });
    }
  });

  // API health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      groqKeySet: !!process.env.GROQ_API_KEY,
      env: process.env.NODE_ENV
    });
  });

  // Fast first sentence endpoint
  app.post("/api/chat-fast", async (req, res) => {
    try {
      const { message, image } = req.body;
      if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: "API key missing" });

      const model = image ? "llama-3.2-11b-vision-preview" : "llama3-8b-8192";
      const content: any[] = [];
      if (message) content.push({ type: "text", text: message });
      if (image) content.push({ type: "image_url", image_url: { url: image } });

      const response = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a fast assistant. Provide ONLY the first sentence of a response to the user's prompt. Be natural and concise. ALWAYS respond in English.",
          },
          {
            role: "user",
            content: content.length > 0 ? content : message,
          },
        ],
        model: model,
        max_tokens: 50,
      });

      const firstSentence = response.choices[0]?.message?.content || "";
      res.json({ content: firstSentence });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API endpoint for Groq Chat (Streaming)
  app.post("/api/chat", async (req, res) => {
    console.log("Received chat request:", req.body);
    try {
      const { message, image } = req.body;
      
      if (!process.env.GROQ_API_KEY) {
        console.error("GROQ_API_KEY missing");
        return res.status(500).json({ error: "GROQ_API_KEY is not set in environment variables (Secrets panel)." });
      }

      // Set headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const model = image ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile";
      const userContent: any[] = [];
      if (message) userContent.push({ type: "text", text: message });
      if (image) userContent.push({ type: "image_url", image_url: { url: image } });

      const stream = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a helpful and very fast AI assistant. Keep your responses concise and friendly. ALWAYS respond in English, even if the user speaks another language.",
          },
          {
            role: "user",
            content: userContent.length > 0 ? userContent : message,
          },
        ],
        model: model,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      console.error("Detailed Groq API Error:", error);
      // If headers haven't been sent, we can send a 500
      if (!res.headersSent) {
        res.status(error.status || 500).json({ 
          error: error.message || "Failed to get response from Groq",
          details: error.error?.message || null
        });
      } else {
        // If streaming already started, send error via SSE
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }
    }
  });

  // API endpoint for Gemini Chat (Streaming) with Search Grounding
  app.post("/api/chat-gemini", async (req, res) => {
    try {
      const { message, image, history } = req.body;
      
      const ai = getGenAI();

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const contents: any[] = [];
      
      // Add history if provided
      if (history && Array.isArray(history)) {
        contents.push(...history);
      }

      // Add current message
      const parts: any[] = [];
      if (message) parts.push({ text: message });
      if (image && image.startsWith("data:image")) {
        const [mimeType, base64Data] = image.split(";")[0].split(":")[1] && image.split(",")[1] 
          ? [image.split(";")[0].split(":")[1], image.split(",")[1]]
          : ["image/jpeg", image];
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data
          }
        });
      }
      contents.push({ role: "user", parts });

      const stream = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents,
        config: {
          systemInstruction: "You are a helpful and fast AI assistant. ALWAYS respond in English. Use Google Search grounding to provide accurate and up-to-date information when needed.",
          tools: [{ googleSearch: {} }],
        },
      });

      let groundingMetadataSent = false;

      for await (const chunk of stream) {
        const text = chunk.text || "";
        
        // Check for grounding metadata in the first chunk or whenever it appears
        const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
        if (groundingMetadata && !groundingMetadataSent) {
          res.write(`data: ${JSON.stringify({ groundingMetadata })}\n\n`);
          groundingMetadataSent = true;
        }

        if (text) {
          res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      } else {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled Server Error:", err);
    res.status(err.status || 500).json({
      error: err.message || "Internal Server Error",
      details: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
