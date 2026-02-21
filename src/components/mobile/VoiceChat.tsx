import { useState, useRef, useCallback, useEffect, forwardRef } from "react";
import { Mic, MicOff, X, Settings, History, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

import { supabase as timelessSupabase, TIMELESS_SUPABASE_URL, TIMELESS_ANON_KEY } from "@/lib/supabase";
import { VoiceChatVisualizer } from "./VoiceChatVisualizer";

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}
interface SpeechRecognitionInterface extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

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
const VOICE_MODEL = "gemini-3-flash";

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

const VoiceChat = forwardRef<HTMLDivElement, VoiceChatProps>(({ isOpen, onClose, onSwitchToText, model }, ref) => {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<VoiceSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);
  const conversationRef = useRef<Array<{ role: string; content: string }>>([]);
  const speechQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  // Fetch voice sessions from the primary project
  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const session = await timelessSupabase.auth.getSession();
      const token = session.data.session?.access_token;
      const userId = session.data.session?.user?.id;
      if (!userId || !token) {
        setSessions([]);
        return;
      }

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

      if (res.ok) {
        const data = await res.json();
        setSessions(data || []);
      }
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

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis?.getVoices() || [];
      const voicePriority = [
        (v: SpeechSynthesisVoice) => v.name.includes("Google UK English Female") && v.lang.startsWith("en"),
        (v: SpeechSynthesisVoice) => v.name.includes("Google US English") && v.lang.startsWith("en"),
        (v: SpeechSynthesisVoice) => v.name === "Samantha" && v.lang.startsWith("en"),
        (v: SpeechSynthesisVoice) => v.name.includes("Google") && v.lang.startsWith("en"),
        (v: SpeechSynthesisVoice) => v.lang.startsWith("en-US"),
        (v: SpeechSynthesisVoice) => v.lang.startsWith("en"),
      ];
      for (const matcher of voicePriority) {
        const voice = voices.find(matcher);
        if (voice) { setSelectedVoice(voice); break; }
      }
    };
    loadVoices();
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // Init speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        recognitionRef.current = new SR();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onresult = (event) => {
          if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
          let finalTranscript = "";
          let interimTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) finalTranscript += result[0].transcript;
            else interimTranscript += result[0].transcript;
          }
          // If user speaks while AI is talking, interrupt AI immediately
          if ((finalTranscript || interimTranscript) && isSpeakingRef.current) {
            window.speechSynthesis?.cancel();
            speechQueueRef.current = [];
            isSpeakingRef.current = false;
            currentUtteranceRef.current = null;
            shouldAutoRestartRef.current = false;
            streamAbortRef.current?.abort();
            setVoiceState("listening");
          }
          setTranscript(finalTranscript || interimTranscript);
          if (finalTranscript) {
            silenceTimeoutRef.current = setTimeout(() => {
              recognitionRef.current?.stop();
              handleSendMessage(finalTranscript.trim());
            }, 800);
          }
        };
        recognitionRef.current.onerror = (event) => {
          if (event.error !== "no-speech" && event.error !== "aborted") setError(`Speech error: ${event.error}`);
          setVoiceState("idle");
        };
        recognitionRef.current.onend = () => {
          if (voiceState === "listening") setVoiceState("idle");
        };
      } else {
        setError("Speech recognition not supported");
      }
    }
    return () => {
      recognitionRef.current?.abort();
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      streamAbortRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const shouldAutoRestartRef = useRef(false);

  const speakNextChunk = useCallback(() => {
    if (!window.speechSynthesis || isMuted) { isSpeakingRef.current = false; return; }
    const nextText = speechQueueRef.current.shift();
    if (!nextText) {
      isSpeakingRef.current = false;
      if (shouldAutoRestartRef.current) {
        shouldAutoRestartRef.current = false;
        setVoiceState("idle");
        setTimeout(() => {
          if (recognitionRef.current) {
            setVoiceState("listening");
            try { recognitionRef.current.start(); } catch { setVoiceState("idle"); }
          }
        }, 500);
      }
      return;
    }
    isSpeakingRef.current = true;
    setVoiceState("speaking");
    shouldAutoRestartRef.current = true;
    const utterance = new SpeechSynthesisUtterance(nextText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.onend = () => { currentUtteranceRef.current = null; speakNextChunk(); };
    utterance.onerror = () => { currentUtteranceRef.current = null; speakNextChunk(); };
    currentUtteranceRef.current = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [selectedVoice, isMuted]);

  const queueSpeech = useCallback((text: string) => {
    const cleaned = text.replace(/```[\s\S]*?```/g, "code block").replace(/`([^`]+)`/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1").replace(/#{1,6}\s/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
    if (!cleaned) return;
    speechQueueRef.current.push(cleaned);
    if (!isSpeakingRef.current && !isMuted) speakNextChunk();
  }, [speakNextChunk, isMuted]);

  const handleSendMessage = async (text: string) => {
    setVoiceState("processing");
    setResponse("");
    setError(null);
    speechQueueRef.current = [];
    streamAbortRef.current?.abort();
    streamAbortRef.current = new AbortController();
    try {
      conversationRef.current.push({ role: "user", content: text });
      const session = await timelessSupabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch(`${TIMELESS_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": TIMELESS_ANON_KEY, ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify({ messages: conversationRef.current, model: VOICE_MODEL, webSearch: false }),
        signal: streamAbortRef.current.signal,
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buffer = "", fullResponse = "", sentenceBuffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              setResponse(fullResponse);
              sentenceBuffer += content;
              const phraseMatch = sentenceBuffer.match(/^(.*?[.!?,;:])\s*/);
              if (phraseMatch && phraseMatch[1].length > 10) {
                queueSpeech(phraseMatch[1]);
                sentenceBuffer = sentenceBuffer.slice(phraseMatch[0].length);
              } else if (sentenceBuffer.length > 60) {
                const words = sentenceBuffer.split(' ');
                if (words.length > 5) {
                  queueSpeech(words.slice(0, -1).join(' '));
                  sentenceBuffer = words[words.length - 1];
                }
              }
            }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
      if (sentenceBuffer.trim()) queueSpeech(sentenceBuffer.trim());
      if (fullResponse) conversationRef.current.push({ role: "assistant", content: fullResponse });
      if (isMuted || speechQueueRef.current.length === 0) setVoiceState("idle");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to get response");
      setVoiceState("idle");
    }
  };

  const interruptAI = useCallback(() => {
    // Stop TTS playback
    window.speechSynthesis?.cancel();
    speechQueueRef.current = [];
    isSpeakingRef.current = false;
    currentUtteranceRef.current = null;
    shouldAutoRestartRef.current = false;
    // Abort any ongoing stream
    streamAbortRef.current?.abort();
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) { setError("Speech recognition not available"); return; }
    // If AI is speaking or processing, interrupt it first
    if (voiceState === "speaking" || voiceState === "processing") {
      interruptAI();
    }
    setError(null);
    setTranscript("");
    setResponse("");
    setVoiceState("listening");
    try { recognitionRef.current.start(); } catch { setVoiceState("idle"); }
  }, [interruptAI, voiceState]);

  const stopListening = useCallback(() => {
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    recognitionRef.current?.stop();
    setVoiceState("idle");
  }, []);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      window.speechSynthesis?.cancel();
      speechQueueRef.current = [];
      isSpeakingRef.current = false;
      if (voiceState === "speaking") setVoiceState("idle");
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      recognitionRef.current?.abort();
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      streamAbortRef.current?.abort();
      window.speechSynthesis?.cancel();
      speechQueueRef.current = [];
      isSpeakingRef.current = false;
      setVoiceState("idle");
      setTranscript("");
      setResponse("");
      conversationRef.current = [];
      setIsClosing(false);
      onClose();
    }, 300);
  };

  const getStatusLabel = () => {
    switch (voiceState) {
      case "listening": return "Listening...";
      case "processing": return "Thinking...";
      case "speaking": return "";
      default: return "Say something...";
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
                  className="w-full text-left px-3 py-3 rounded-lg hover:bg-foreground/5 transition-colors group"
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

      {/* Top bar: History + Settings */}
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

      {/* Response area at top */}
      <div className="flex-shrink-0 px-6 min-h-[80px]">
        {response ? (
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
          onClick={voiceState === "listening" ? stopListening : startListening}
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
