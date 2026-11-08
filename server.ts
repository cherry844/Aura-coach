import http from "http";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, LiveServerMessage, Modality, ThinkingLevel } from "@google/genai";
import { WebSocketServer, WebSocket } from "ws";

dotenv.config();

const PORT = 3000;
const SYSTEM_INSTRUCTION = "You are Aura, a high-performance AI life coach and problem solver. Your goal is to provide actionable, empathetic, and creative solutions to user problems. Use Markdown formatting for your responses: use bold for emphasis, bullet points for lists, and code blocks for technical steps or structured data. Keep responses concise and always encourage the user to learn a new micro-skill to overcome their challenges.";

// Server-side GoogleGenAI initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

/**
 * Retries a Gemini API call up to maxRetries times if 503 UNAVAILABLE is returned.
 */
async function callGeminiWithRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelayMs = 1000): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const is503 =
        error?.status === 503 ||
        error?.code === 503 ||
        (typeof error?.message === "string" &&
          (error.message.includes("503") ||
            error.message.includes("UNAVAILABLE") ||
            error.message.includes("overloaded")));

      if (is503 && attempt <= maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1); // 1s, 2s, 4s
        console.warn(`[Gemini 503 UNAVAILABLE] Retrying attempt ${attempt}/${maxRetries} after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Server-side Gemini chat endpoint with retry for 503 UNAVAILABLE
  app.post(["/api/coach/chat", "/api/coach/chat/"], async (req, res) => {
    try {
      const { history } = req.body;
      if (!history || !Array.isArray(history)) {
        return res.status(400).json({ error: "Missing or invalid 'history' payload." });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: "GEMINI_API_KEY is not configured on the server. Please check Settings > Secrets.",
        });
      }

      const response = await callGeminiWithRetry(
        () =>
          ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: history,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              thinkingConfig: {
                thinkingLevel: ThinkingLevel.LOW,
              },
            },
          }),
        3,
        1000
      );

      return res.json({ text: response.text ?? "" });
    } catch (error: any) {
      console.error("Gemini API server error:", error);
      const is503 =
        error?.status === 503 ||
        error?.code === 503 ||
        (typeof error?.message === "string" &&
          (error.message.includes("503") || error.message.includes("UNAVAILABLE")));

      const status = is503 ? 503 : error?.status || 500;
      return res.status(status).json({
        error: error?.message || "Failed to generate AI coach response.",
      });
    }
  });

  // Server-side Gemini chat streaming endpoint (Server-Sent Events) with 503 retry
  app.post(["/api/coach/chat-stream", "/api/coach/chat-stream/"], async (req, res) => {
    try {
      const { history } = req.body;
      if (!history || !Array.isArray(history)) {
        return res.status(400).json({ error: "Missing or invalid 'history' payload." });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: "GEMINI_API_KEY is not configured on the server. Please check Settings > Secrets.",
        });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const responseStream = await callGeminiWithRetry(
        () =>
          ai.models.generateContentStream({
            model: "gemini-3.8-flash",
            contents: history,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              thinkingConfig: {
                thinkingLevel: ThinkingLevel.LOW,
              },
            },
          }),
        3,
        1000
      );

      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("Gemini streaming server error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error?.message || "Streaming failed." });
      } else {
        res.write(`data: ${JSON.stringify({ error: error?.message || "Stream error." })}\n\n`);
        res.end();
      }
    }
  });

  // Explicit JSON 404 for any unhandled /api/** requests so they NEVER fall through to index.html
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `Not Found: ${req.method} ${req.path}` });
  });

  const server = http.createServer(app);

  // WebSocket Server for Gemini Live API
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", async (clientWs: WebSocket) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        clientWs.send(JSON.stringify({ error: "GEMINI_API_KEY is not configured on the server." }));
        clientWs.close();
        return;
      }

      const session = await ai.live.connect({
        model: "gemini-3.8-live",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            for (const part of message.serverContent?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
              }
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
          onclose: () => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.close();
            }
          },
        },
      });

      clientWs.on("message", (raw) => {
        try {
          const payload = JSON.parse(raw.toString());
          if (payload.audio) {
            session.sendRealtimeInput({
              audio: { data: payload.audio, mimeType: "audio/pcm;rate=16000" },
            });
          } else if (payload.text) {
            session.sendRealtimeInput({
              text: payload.text,
            });
          }
        } catch (err) {
          console.error("Error processing incoming live message:", err);
        }
      });

      clientWs.on("close", () => {
        try {
          session.close();
        } catch (_) {}
      });
    } catch (err: any) {
      console.error("Error establishing Gemini Live API session:", err);
      clientWs.send(JSON.stringify({ error: err?.message || "Live API connection failed." }));
      clientWs.close();
    }
  });

  // Handle upgrade for /live endpoint
  server.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;
    if (pathname === "/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
