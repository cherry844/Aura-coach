export interface ChatHistoryItem {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface CoachResponseResult {
  text: string;
  groundingSources?: GroundingSource[];
  searchQueries?: string[];
}

/**
 * Request an AI response from Aura Life Coach via the server-side Gemini API (gemini-3.8-flash).
 * Includes:
 * - Google Search Grounding with web sources & queries
 * - 3x retry logic with delay for 503 UNAVAILABLE errors
 * - try/catch wrapped response.json() to gracefully handle HTML fallback
 */
export const getCoachResponse = async (
  history: ChatHistoryItem[],
  useSearch: boolean = false
): Promise<CoachResponseResult | undefined> => {
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
        body: JSON.stringify({ history, useSearch }),
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
        return {
          text: "I'm temporarily refreshing my coaching connection. Please send your message again in a moment!",
        };
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

      return {
        text: data?.text ?? "",
        groundingSources: data?.groundingSources || [],
        searchQueries: data?.searchQueries || [],
      };
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
 * Stream an AI response from Aura Life Coach via Server-Sent Events from the server-side Gemini API (gemini-3.8-flash).
 */
export const getCoachResponseStream = async (
  history: ChatHistoryItem[],
  onChunk: (chunkText: string) => void,
  onGrounding?: (sources: GroundingSource[]) => void,
  useSearch: boolean = false
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
        body: JSON.stringify({ history, useSearch }),
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
            if (parsed.groundingSources && onGrounding) {
              onGrounding(parsed.groundingSources);
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

/**
 * Transcribe microphone or audio input using model gemini-3.5-transcribe on the server.
 */
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        if (!base64Data) {
          throw new Error('Failed to convert audio recording to base64.');
        }

        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audio: base64Data,
            mimeType: audioBlob.type || 'audio/webm',
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error || `Transcription failed with status ${res.status}`);
        }

        const data = await res.json();
        resolve(data.transcript || '');
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read audio blob'));
    reader.readAsDataURL(audioBlob);
  });
};

/**
 * Helper to convert Float32 audio samples to 16-bit PCM little-endian base64 string
 */
function floatTo16BitPCM(input: Float32Array): string {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(output.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Manages real-time low-latency voice conversations with model gemini-3.8-live (Live API)
 */
export class LiveVoiceSession {
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private nextStartTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isMuted: boolean = false;
  private isConnected: boolean = false;

  public onTranscript?: (data: { user?: string; aura?: string }) => void;
  public onInterrupted?: () => void;
  public onError?: (err: string) => void;
  public onStatusChange?: (status: 'disconnected' | 'connecting' | 'connected' | 'speaking' | 'listening') => void;

  constructor() {
    this.isMuted = false;
  }

  public async start(): Promise<void> {
    try {
      this.onStatusChange?.('connecting');

      // Initialize 16kHz AudioContext for mic input and 24kHz for model playback
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.inputAudioCtx = new AudioCtx({ sampleRate: 16000 });
      this.outputAudioCtx = new AudioCtx({ sampleRate: 24000 });

      // Request user microphone
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Connect WebSocket to /live
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.onStatusChange?.('connected');
        this.setupMicPipeline();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.error) {
            this.onError?.(msg.error);
            return;
          }

          if (msg.inputTranscript) {
            this.onTranscript?.({ user: msg.inputTranscript });
            this.onStatusChange?.('listening');
          }

          if (msg.outputTranscript || msg.text) {
            this.onTranscript?.({ aura: msg.outputTranscript || msg.text });
          }

          if (msg.audio) {
            this.onStatusChange?.('speaking');
            this.playAudioChunk(msg.audio);
          }

          if (msg.interrupted) {
            this.stopPlayback();
            this.onInterrupted?.();
            this.onStatusChange?.('listening');
          }

          if (msg.turnComplete) {
            this.onStatusChange?.('listening');
          }
        } catch (e) {
          console.error("LiveVoiceSession onmessage error:", e);
        }
      };

      this.ws.onerror = (e) => {
        console.error("LiveVoiceSession WebSocket error:", e);
        this.onError?.("WebSocket connection to Live API failed.");
        this.onStatusChange?.('disconnected');
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.onStatusChange?.('disconnected');
        this.stop();
      };

    } catch (err: any) {
      console.error("Failed to start LiveVoiceSession:", err);
      const isPermissionDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        (typeof err?.message === 'string' && (err.message.includes('Permission') || err.message.includes('denied')));
      const msg = isPermissionDenied
        ? "Microphone access was denied. Please allow microphone permissions in your browser address bar or site settings."
        : (err?.message || "Could not access microphone or connect to Live API.");
      this.onError?.(msg);
      this.onStatusChange?.('disconnected');
      this.stop();
    }
  }

  private setupMicPipeline(): void {
    if (!this.inputAudioCtx || !this.micStream || !this.ws) return;

    const source = this.inputAudioCtx.createMediaStreamSource(this.micStream);
    // Buffer size 4096 = ~256ms of 16kHz audio per frame
    this.processor = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (this.isMuted || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      const inputData = e.inputBuffer.getChannelData(0);
      const base64Pcm = floatTo16BitPCM(inputData);
      this.ws.send(JSON.stringify({ audio: base64Pcm }));
    };

    source.connect(this.processor);
    this.processor.connect(this.inputAudioCtx.destination);
  }

  private playAudioChunk(base64Audio: string): void {
    if (!this.outputAudioCtx) return;

    try {
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert 16-bit PCM little endian bytes to Float32
      const numSamples = Math.floor(len / 2);
      const int16Array = new Int16Array(bytes.buffer, 0, numSamples);
      const float32Array = new Float32Array(numSamples);

      for (let i = 0; i < numSamples; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = this.outputAudioCtx.createBuffer(1, numSamples, 24000);
      audioBuffer.copyToChannel(float32Array, 0);

      const sourceNode = this.outputAudioCtx.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(this.outputAudioCtx.destination);

      const now = this.outputAudioCtx.currentTime;
      if (this.nextStartTime < now) {
        this.nextStartTime = now + 0.05; // tiny buffer against jitter
      }

      sourceNode.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.activeSources.push(sourceNode);

      sourceNode.onended = () => {
        const idx = this.activeSources.indexOf(sourceNode);
        if (idx > -1) this.activeSources.splice(idx, 1);
      };
    } catch (err) {
      console.error("Error decoding and playing 24kHz audio chunk:", err);
    }
  }

  public stopPlayback(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch (_) {}
    }
    this.activeSources = [];
    if (this.outputAudioCtx) {
      this.nextStartTime = this.outputAudioCtx.currentTime;
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public stop(): void {
    this.stopPlayback();

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.inputAudioCtx && this.inputAudioCtx.state !== 'closed') {
      this.inputAudioCtx.close().catch(() => {});
      this.inputAudioCtx = null;
    }

    if (this.outputAudioCtx && this.outputAudioCtx.state !== 'closed') {
      this.outputAudioCtx.close().catch(() => {});
      this.outputAudioCtx = null;
    }

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      this.ws = null;
    }

    this.isConnected = false;
    this.onStatusChange?.('disconnected');
  }
}
