export interface ChatHistoryItem {
  role: 'user' | 'model';
  parts: { text: string }[];
}

/**
 * Request an AI response from Aura Life Coach via the server-side Gemini API.
 * Includes:
 * - 3x retry logic with delay for 503 UNAVAILABLE errors
 * - try/catch wrapped response.json() to gracefully handle HTML fallback
 */
export const getCoachResponse = async (history: ChatHistoryItem[]): Promise<string | undefined> => {
  const maxRetries = 3;
  let delayMs = 1000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ history }),
      });

      // Handle 503 UNAVAILABLE with retry delay
      if (response.status === 503) {
        if (attempt < maxRetries) {
          console.warn(`[Gemini 503 UNAVAILABLE] Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})...`);
          await new Promise((r) => setTimeout(r, delayMs));
          delayMs *= 2;
          continue;
        }
      }

      // Wrap response.json() in try/catch to handle HTML fallback safely
      let data: any = null;
      let isHtmlFallback = false;

      try {
        data = await response.json();
      } catch (jsonError) {
        isHtmlFallback = true;
        console.warn("Detected non-JSON or HTML fallback from /api/coach/chat:", jsonError);
      }

      if (isHtmlFallback) {
        if (attempt < maxRetries) {
          console.warn(`Retrying /api/coach/chat in ${delayMs}ms after HTML fallback (attempt ${attempt + 1}/${maxRetries})...`);
          await new Promise((r) => setTimeout(r, delayMs));
          delayMs *= 2;
          continue;
        }
        return "I'm temporarily refreshing my coaching connection. Please send your message again in a moment!";
      }

      if (!response.ok) {
        const errorMsg = data?.error || `Server responded with status ${response.status}`;
        const is503 = response.status === 503 || errorMsg.includes("503") || errorMsg.includes("UNAVAILABLE");

        if (is503 && attempt < maxRetries) {
          console.warn(`[Gemini 503 error] Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries}): ${errorMsg}`);
          await new Promise((r) => setTimeout(r, delayMs));
          delayMs *= 2;
          continue;
        }

        throw new Error(errorMsg);
      }

      return data?.text ?? "";
    } catch (error: any) {
      const is503 = error?.message?.includes("503") || error?.message?.includes("UNAVAILABLE");
      if (is503 && attempt < maxRetries) {
        console.warn(`[Gemini 503 error caught] Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, delayMs));
        delayMs *= 2;
        continue;
      }

      if (attempt >= maxRetries) {
        console.error("All retry attempts failed for getCoachResponse:", error);
        throw error;
      }

      // General retry delay for unexpected network blips
      await new Promise((r) => setTimeout(r, delayMs));
      delayMs *= 2;
    }
  }

  return undefined;
};

/**
 * Stream an AI response from Aura Life Coach via Server-Sent Events from the server-side Gemini API.
 */
export const getCoachResponseStream = async (
  history: ChatHistoryItem[],
  onChunk: (chunkText: string) => void
): Promise<string> => {
  const maxRetries = 3;
  let delayMs = 1000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('/api/coach/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ history }),
      });

      if (response.status === 503 && attempt < maxRetries) {
        console.warn(`[Stream 503 UNAVAILABLE] Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, delayMs));
        delayMs *= 2;
        continue;
      }

      if (!response.ok) {
        let errorMsg = `Server responded with status ${response.status}`;
        try {
          const errData = await response.json();
          if (errData?.error) errorMsg = errData.error;
        } catch (_) {
          // HTML fallback handled
        }
        if ((response.status === 503 || errorMsg.includes("503") || errorMsg.includes("UNAVAILABLE")) && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, delayMs));
          delayMs *= 2;
          continue;
        }
        throw new Error(errorMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Streaming response body is unavailable.');
      }

      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.replace(/^data:\s*/, '');
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.text) {
              fullText += parsed.text;
              onChunk(parsed.text);
            }
          } catch (_) {
            // ignore partial json
          }
        }
      }

      return fullText;
    } catch (error: any) {
      const is503 = error?.message?.includes("503") || error?.message?.includes("UNAVAILABLE");
      if (is503 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delayMs));
        delayMs *= 2;
        continue;
      }
      if (attempt >= maxRetries) {
        throw error;
      }
    }
  }

  return '';
};
