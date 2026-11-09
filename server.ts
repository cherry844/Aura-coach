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

  // Helper for generating custom vector cover illustrations
  function generateBespokeCoverSvg(title: string, category: string): string {
    const cleanTitle = (title || "Micro-Lesson").replace(/[<>&"']/g, (c) => ({
      '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;'
    }[c] || c));
    const cleanCategory = (category || "General Skill").toUpperCase().replace(/[<>&"']/g, '');

    // Category-specific color schemes
    const cat = (category || '').toLowerCase();
    let c1 = '#4F46E5', c2 = '#7C3AED', c3 = '#06B6D4', accent = '#A5B4FC'; // default Indigo/Violet
    if (cat.includes('prod') || cat.includes('habit') || cat.includes('focus')) {
      c1 = '#4338CA'; c2 = '#6366F1'; c3 = '#38BDF8'; accent = '#C7D2FE';
    } else if (cat.includes('cook') || cat.includes('culin') || cat.includes('food') || cat.includes('bake')) {
      c1 = '#9A3412'; c2 = '#EA580C'; c3 = '#F59E0B'; accent = '#FED7AA';
    } else if (cat.includes('desig') || cat.includes('art') || cat.includes('ui') || cat.includes('ux')) {
      c1 = '#701A75'; c2 = '#C026D3'; c3 = '#EC4899'; accent = '#FBCFE8';
    } else if (cat.includes('tech') || cat.includes('code') || cat.includes('dev') || cat.includes('data')) {
      c1 = '#0C4A6E'; c2 = '#0284C7'; c3 = '#06B6D4'; accent = '#BAE6FD';
    } else if (cat.includes('lang') || cat.includes('writ') || cat.includes('speak') || cat.includes('comm')) {
      c1 = '#831843'; c2 = '#DB2777'; c3 = '#E11D48'; accent = '#FCE7F3';
    } else if (cat.includes('health') || cat.includes('fit') || cat.includes('mind') || cat.includes('well')) {
      c1 = '#064E3B'; c2 = '#059669'; c3 = '#10B981'; accent = '#A7F3D0';
    } else if (cat.includes('bus') || cat.includes('lead') || cat.includes('fin') || cat.includes('manag')) {
      c1 = '#0F172A'; c2 = '#334155'; c3 = '#64748B'; accent = '#E2E8F0';
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}" />
      <stop offset="60%" stop-color="${c2}" />
      <stop offset="100%" stop-color="${c3}" />
    </linearGradient>
    <radialGradient id="glow" cx="80%" cy="20%" r="60%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.45" />
      <stop offset="100%" stop-color="${c1}" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.04" />
    </linearGradient>
    <filter id="blurFilter" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="60" />
    </filter>
  </defs>

  <!-- Background base -->
  <rect width="1200" height="675" fill="url(#bg)" />
  <rect width="1200" height="675" fill="url(#glow)" />

  <!-- Subtle ambient glow orbs -->
  <circle cx="1050" cy="150" r="280" fill="${accent}" opacity="0.3" filter="url(#blurFilter)" />
  <circle cx="150" cy="550" r="220" fill="${c3}" opacity="0.35" filter="url(#blurFilter)" />

  <!-- Geometric Decorative Elements -->
  <g opacity="0.25">
    <circle cx="950" cy="340" r="160" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="8 8" />
    <circle cx="950" cy="340" r="220" fill="none" stroke="#ffffff" stroke-width="1.5" />
    <circle cx="950" cy="340" r="70" fill="none" stroke="#ffffff" stroke-width="2" />
    <path d="M 800,200 L 1100,500 M 800,500 L 1100,200" stroke="#ffffff" stroke-width="1" stroke-dasharray="4 6" />
    <rect x="870" y="260" width="160" height="160" rx="32" fill="none" stroke="#ffffff" stroke-width="3" transform="rotate(45 950 340)" />
  </g>

  <!-- Modern Aura Glass Overlay Card -->
  <rect x="80" y="80" width="1040" height="515" rx="36" fill="url(#cardGrad)" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.35" />

  <!-- Aura Branding Header -->
  <g transform="translate(140, 150)">
    <!-- Aura Sparkle Logo -->
    <path d="M 20 0 L 25 15 L 40 20 L 25 25 L 20 40 L 15 25 L 0 20 L 15 15 Z" fill="#ffffff" />
    <text x="52" y="27" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="800" letter-spacing="3">AURA • MICRO-LESSON</text>
  </g>

  <!-- Category Tag Badge -->
  <g transform="translate(140, 220)">
    <rect width="220" height="42" rx="12" fill="#000000" fill-opacity="0.25" stroke="${accent}" stroke-width="1.5" />
    <text x="110" y="26" text-anchor="middle" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" letter-spacing="2">${cleanCategory}</text>
  </g>

  <!-- Main Lesson Title -->
  <g transform="translate(140, 340)">
    <text fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="900" letter-spacing="-0.5">
      ${cleanTitle.length > 40 ? cleanTitle.substring(0, 38) + '...' : cleanTitle}
    </text>
    <text y="70" fill="${accent}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="500">
      Actionable 5-10 min community mastery module
    </text>
  </g>

  <!-- Bottom Details Bar -->
  <g transform="translate(140, 520)">
    <circle cx="16" cy="16" r="16" fill="#ffffff" fill-opacity="0.2" />
    <path d="M 16 8 L 16 16 L 22 20" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" fill="none" />
    <text x="44" y="22" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="600" opacity="0.9">Interactive Micro-Curriculum</text>
  </g>
</svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  // Cover image generation endpoint
  app.post(["/api/lessons/generate-cover", "/api/lessons/generate-cover/"], async (req, res) => {
    try {
      const { title, category, description } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Title is required for cover generation." });
      }

      // First attempt Gemini image generation if key is present
      if (process.env.GEMINI_API_KEY) {
        try {
          const genRes = await ai.models.generateImages({
            model: "gemini-3.1-flash-lite-image",
            prompt: `Educational modern cover illustration for a micro-lesson titled "${title}" in category "${category || 'General'}". Flat vector aesthetic, vibrant gradients, clean geometry, minimalist composition, educational icons, beautiful Aura brand styling. No watermarks.`,
            config: {
              numberOfImages: 1,
              outputMimeType: "image/png",
              aspectRatio: "16:9",
            },
          });

          if (genRes.generatedImages && genRes.generatedImages.length > 0) {
            const imgData = genRes.generatedImages[0].image?.imageBytes;
            if (imgData) {
              return res.json({
                imageUrl: `data:image/png;base64,${imgData}`,
                source: "ai",
                title,
                category: category || "General"
              });
            }
          }
        } catch (imgErr: any) {
          console.warn("Gemini image model call unavailable, using bespoke SVG generator:", imgErr?.message);
        }
      }

      // High-fidelity vector SVG fallback tailored to category and title
      const bespokeSvgDataUrl = generateBespokeCoverSvg(title, category || 'General');
      return res.json({
        imageUrl: bespokeSvgDataUrl,
        source: "fallback",
        title,
        category: category || "General"
      });
    } catch (error: any) {
      console.error("Cover generation error:", error);
      return res.status(500).json({ error: error?.message || "Failed to generate cover image." });
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
