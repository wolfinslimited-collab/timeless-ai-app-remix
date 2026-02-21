import { useState, useRef, useCallback, useEffect, forwardRef } from "react";
import { Mic, MicOff, X, Settings, History, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

import { supabase as timelessSupabase, TIMELESS_SUPABASE_URL, TIMELESS_ANON_KEY } from "@/lib/supabase";
import { VoiceChatVisualizer } from "./VoiceChatVisualizer";

interface VoiceChatProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToText?: () => void;
  model: string;
}

interface VoiceSession {
  id: string;
  title: string;
  transcript: unknown;
  created_at: string;
}

type VoiceState = "idle" | "listening" | "processing" | "speaking";

const cleanMarkdown = (text: string): string => {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const formatSessionDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// Convert Float32 audio samples to PCM16 Little-Endian bytes
function float32ToPcm16(float32: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

// Convert ArrayBuffer to base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Decode base64 PCM16 audio to Float32Array for playback
function pcm16Base64ToFloat32(base64: string): Float32Array {
  const binaryStr = atob(base64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer);
  const float32 = new Float32Array(len / 2);
  for (let i = 0; i < float32.length; i++) {
    const int16 = view.getInt16(i * 2, true);
    float32[i] = int16 / 32768;
  }
  return float32;
}

// Resample audio from inputRate to outputRate
function resampleAudio(input: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (inputRate === outputRate) return input;
  const ratio = inputRate / outputRate;
  const outputLength = Math.round(input.length / ratio);
  const output = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const srcIdx = i * ratio;
    const idx = Math.floor(srcIdx);
    const frac = srcIdx - idx;
    output[i] = idx + 1 < input.length
      ? input[idx] * (1 - frac) + input[idx + 1] * frac
      : input[idx] || 0;
  }
  return output;
}

const VoiceChat = forwardRef<HTMLDivElement, VoiceChatProps>(({ isOpen, onClose, onSwitchToText, model }, ref) => {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<VoiceSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedSession, setSelectedSession] = useState<VoiceSession | null>(null);

  // Audio & WebSocket refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const isConnectedRef = useRef(false);
  const isListeningRef = useRef(false);

  // Fetch voice sessions
  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const session = await timelessSupabase.auth.getSession();
      const token = session.data.session?.access_token;
      const userId = session.data.session?.user?.id;
      if (!userId || !token) { setSessions([]); return; }

      const res = await fetch(
        `${TIMELESS_SUPABASE_URL}/rest/v1/voice_sessions?select=id,title,transcript,created_at&user_id=eq.${userId}&order=created_at.desc&limit=50`,
        {
          headers: {
            "apikey": TIMELESS_ANON_KEY,
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
          },
        }
      );
      if (res.ok) setSessions(await res.json() || []);
    } catch (err) {
      console.error("Failed to fetch voice sessions:", err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const toggleHistory = () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next) fetchSessions();
  };

  // Play queued audio chunks through Web Audio API
  const playNextAudioChunk = useCallback(() => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;

    isPlayingRef.current = true;
    const samples = audioQueueRef.current.shift()!;

    if (!playbackContextRef.current || playbackContextRef.current.state === "closed") {
      playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    const ctx = playbackContextRef.current;
    const audioBuffer = ctx.createBuffer(1, samples.length, 24000);
    audioBuffer.getChannelData(0).set(samples);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.onended = () => {
      isPlayingRef.current = false;
      if (audioQueueRef.current.length > 0) {
        playNextAudioChunk();
      } else {
        // AI finished speaking, auto-restart listening
        if (isConnectedRef.current && isListeningRef.current) {
          setVoiceState("listening");
        }
      }
    };
    source.start();
    setVoiceState("speaking");
  }, []);

  // Handle incoming WebSocket messages from Gemini
  const handleWsMessage = useCallback((event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);

      // Handle server content with audio
      if (msg.serverContent) {
        const parts = msg.serverContent.modelTurn?.parts;
        if (parts) {
          for (const part of parts) {
            // Audio response
            if (part.inlineData?.mimeType?.startsWith("audio/pcm")) {
              const float32 = pcm16Base64ToFloat32(part.inlineData.data);
              audioQueueRef.current.push(float32);
              if (!isPlayingRef.current) playNextAudioChunk();
            }
            // Text response (if any)
            if (part.text) {
              setResponse(prev => prev + part.text);
            }
          }
        }

        // Turn complete
        if (msg.serverContent.turnComplete) {
          console.log("[VoiceChat] Turn complete");
          if (audioQueueRef.current.length === 0 && !isPlayingRef.current) {
            if (isConnectedRef.current && isListeningRef.current) {
              setVoiceState("listening");
            }
          }
        }
      }

      // Setup complete
      if (msg.setupComplete) {
        console.log("[VoiceChat] Setup complete, ready for audio");
        isConnectedRef.current = true;
        setVoiceState("listening");
      }
    } catch (e) {
      console.error("[VoiceChat] Failed to parse WS message:", e);
    }
  }, [playNextAudioChunk]);

  // Connect to Gemini Live WebSocket
  const connectToGemini = useCallback(async () => {
    setError(null);
    setVoiceState("processing");

    try {
      // Get WebSocket URL from edge function
      const session = await timelessSupabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setError("Please sign in to use voice chat");
        setVoiceState("idle");
        return;
      }

      // Call the Lovable Cloud edge function, passing the external project's auth token
      const cloudUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/gemini-live-token`;
      const res = await fetch(cloudUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "get_token" }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to get token: ${res.status}`);
      }

      const tokenData = await res.json();
      console.log("[VoiceChat] Token response keys:", Object.keys(tokenData));
      const wsUrl = tokenData.websocket_url;
      if (!wsUrl) throw new Error(`No WebSocket URL returned. Response: ${JSON.stringify(tokenData).slice(0, 200)}`);

      // Open WebSocket
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[VoiceChat] WebSocket connected, sending setup");
        // Send setup message
        ws.send(JSON.stringify({
          setup: {
            model: "models/gemini-2.5-flash-preview-native-audio-dialog",
            generation_config: {
              response_modalities: ["AUDIO"],
              speech_config: {
                voice_config: {
                  prebuilt_voice_config: {
                    voice_name: "Aoede"
                  }
                }
              }
            },
            system_instruction: {
              parts: [{
                text: "You are a helpful, friendly AI assistant. Keep responses concise and conversational. Respond naturally as in a spoken conversation."
              }]
            }
          }
        }));
      };

      ws.onmessage = handleWsMessage;

      ws.onerror = (e) => {
        console.error("[VoiceChat] WebSocket error:", e);
        setError("Connection error. Please try again.");
        cleanupConnection();
        setVoiceState("idle");
      };

      ws.onclose = (e) => {
        console.log("[VoiceChat] WebSocket closed:", e.code, e.reason);
        isConnectedRef.current = false;
        if (isListeningRef.current) {
          setError("Connection closed. Tap to reconnect.");
          cleanupConnection();
          setVoiceState("idle");
        }
      };

      // Start microphone capture
      await startMicCapture(ws);

    } catch (err) {
      console.error("[VoiceChat] Connection error:", err);
      setError(err instanceof Error ? err.message : "Failed to connect");
      setVoiceState("idle");
    }
  }, [handleWsMessage]);

  // Start capturing microphone audio and streaming to WebSocket
  const startMicCapture = async (ws: WebSocket) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // Create AudioContext at the device's native sample rate
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const actualSampleRate = audioContext.sampleRate;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // ScriptProcessor for raw audio access (4096 samples/buffer)
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!isListeningRef.current || ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Resample from device rate to 16kHz for Gemini
        const resampled = resampleAudio(new Float32Array(inputData), actualSampleRate, 16000);

        // Convert to PCM16
        const pcm16 = float32ToPcm16(resampled);

        // Convert to base64
        const base64 = arrayBufferToBase64(pcm16);

        // Send to Gemini
        ws.send(JSON.stringify({
          realtime_input: {
            media_chunks: [{
              data: base64,
              mime_type: "audio/pcm;rate=16000"
            }]
          }
        }));
      };

      source.connect(processor);
      processor.connect(audioContext.destination); // Required for ScriptProcessorNode to work

      isListeningRef.current = true;
      console.log("[VoiceChat] Mic capture started at", actualSampleRate, "Hz, resampling to 16kHz");

    } catch (err) {
      console.error("[VoiceChat] Mic access error:", err);
      setError("Microphone access denied. Please allow microphone access.");
      cleanupConnection();
      setVoiceState("idle");
    }
  };

  // Interrupt AI playback (user spoke or tapped)
  const interruptAI = useCallback(() => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    // Stop any playing audio by closing and recreating playback context
    if (playbackContextRef.current && playbackContextRef.current.state !== "closed") {
      playbackContextRef.current.close().catch(() => {});
      playbackContextRef.current = null;
    }
  }, []);

  // Clean up all connections
  const cleanupConnection = useCallback(() => {
    isListeningRef.current = false;
    isConnectedRef.current = false;

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    interruptAI();
  }, [interruptAI]);

  // Start listening: connect to Gemini and start mic
  const startListening = useCallback(() => {
    if (voiceState === "speaking") {
      interruptAI();
      setVoiceState("listening");
      return;
    }
    setTranscript("");
    setResponse("");
    setError(null);
    connectToGemini();
  }, [connectToGemini, interruptAI, voiceState]);

  // Stop listening
  const stopListening = useCallback(() => {
    cleanupConnection();
    setVoiceState("idle");
  }, [cleanupConnection]);

  // Toggle mute
  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (newMuted) {
      interruptAI();
      // Pause mic by disabling track
      mediaStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = false; });
    } else {
      mediaStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = true; });
    }
  };

  // Close voice chat
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      cleanupConnection();
      setVoiceState("idle");
      setTranscript("");
      setResponse("");
      setIsClosing(false);
      onClose();
    }, 300);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupConnection();
    };
  }, [cleanupConnection]);

  const getStatusLabel = () => {
    switch (voiceState) {
      case "listening": return "Listening...";
      case "processing": return "Connecting...";
      case "speaking": return "";
      default: return "Tap to start";
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute inset-0 z-40 flex flex-col transition-all duration-300",
        isClosing ? "opacity-0 scale-95" : "opacity-100 scale-100 animate-in fade-in zoom-in-95 duration-300"
      )}
      style={{
        background: "radial-gradient(ellipse at 50% 60%, hsla(30, 40%, 12%, 1) 0%, hsla(0, 0%, 5%, 1) 60%, hsla(0, 0%, 3%, 1) 100%)",
      }}
    >
      {/* History Drawer */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 z-50 w-[280px] flex flex-col transition-transform duration-300 ease-in-out",
          showHistory ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          background: "linear-gradient(180deg, hsla(0, 0%, 8%, 0.98) 0%, hsla(0, 0%, 5%, 0.98) 100%)",
          borderRight: "1px solid hsla(0, 0%, 100%, 0.08)",
        }}
      >
        <div className="flex items-center justify-between p-4 pt-6">
          <h3 className="text-foreground/90 text-base font-medium">Voice History</h3>
          <button
            onClick={() => setShowHistory(false)}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {loadingSessions ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-foreground/70 rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground/60 text-sm">No voice sessions yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => {
                    setSelectedSession(session);
                    setShowHistory(false);
                    // Stop any active session
                    cleanupConnection();
                    setVoiceState("idle");
                    setTranscript("");
                    setResponse("");
                    setError(null);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-3 rounded-lg hover:bg-foreground/5 transition-colors group",
                    selectedSession?.id === session.id && "bg-foreground/10"
                  )}
                >
                  <p className="text-foreground/80 text-sm font-medium truncate group-hover:text-foreground transition-colors">
                    {session.title || "Untitled Session"}
                  </p>
                  <p className="text-muted-foreground/50 text-xs mt-0.5">
                    {formatSessionDate(session.created_at)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Backdrop when drawer is open */}
      {showHistory && (
        <div
          className="absolute inset-0 z-45 bg-black/40"
          onClick={() => setShowHistory(false)}
        />
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between p-4 pt-6 relative z-40">
        <button
          onClick={toggleHistory}
          className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
        >
          <History className="h-5 w-5" />
        </button>
        <button className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* Response area */}
      <div className="flex-shrink-0 px-6 min-h-[80px] max-h-[50%] overflow-y-auto">
        {selectedSession ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-foreground/90 text-sm font-medium">{selectedSession.title || "Untitled Session"}</p>
              <button
                onClick={() => setSelectedSession(null)}
                className="text-muted-foreground/60 text-xs hover:text-foreground transition-colors"
              >
                ✕ Close
              </button>
            </div>
            <div className="space-y-2">
              {Array.isArray(selectedSession.transcript) && (selectedSession.transcript as Array<{ role: string; text: string }>).map((msg, i) => (
                <div key={i} className={cn("text-sm", msg.role === "user" ? "text-foreground/70" : "text-foreground/90")}>
                  <span className="text-muted-foreground/50 text-xs mr-1.5">{msg.role === "user" ? "You:" : "AI:"}</span>
                  {msg.text}
                </div>
              ))}
            </div>
          </div>
        ) : response ? (
          <p className="text-foreground/80 text-lg leading-relaxed max-h-[200px] overflow-y-auto">
            {cleanMarkdown(response)}
          </p>
        ) : transcript ? (
          <p className="text-foreground/60 text-lg">{transcript}</p>
        ) : null}
        {error && (
          <p className="text-destructive/80 text-sm mt-2">{error}</p>
        )}
      </div>

      {/* Center: Sphere visualizer */}
      <div className="flex-1 flex items-center justify-center">
        <button
          onClick={voiceState === "idle" ? startListening : voiceState === "speaking" ? () => { interruptAI(); setVoiceState("listening"); } : stopListening}
          disabled={voiceState === "processing"}
          className="focus:outline-none disabled:opacity-50"
        >
          <VoiceChatVisualizer state={voiceState} size={180} />
        </button>
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-center gap-6 pb-4 px-6">
        <button
          onClick={handleClose}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
          style={{ backgroundColor: "hsla(0, 0%, 20%, 0.8)" }}
        >
          <X className="h-6 w-6 text-foreground" />
        </button>

        <p className="text-muted-foreground text-base min-w-[120px] text-center">
          {getStatusLabel()}
        </p>

        <button
          onClick={toggleMute}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
          style={{ backgroundColor: isMuted ? "hsla(0, 70%, 50%, 0.9)" : "hsla(0, 0%, 20%, 0.8)" }}
        >
          {isMuted ? (
            <MicOff className="h-5 w-5 text-foreground" />
          ) : (
            <Mic className="h-5 w-5 text-foreground" />
          )}
        </button>
      </div>
    </div>
  );
});

VoiceChat.displayName = "VoiceChat";

export default VoiceChat;
