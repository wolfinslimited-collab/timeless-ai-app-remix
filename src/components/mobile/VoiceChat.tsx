import { useState, useRef, useCallback, useEffect, forwardRef } from "react";
import { Mic, MicOff, X, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
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

const VoiceChat = forwardRef<HTMLDivElement, VoiceChatProps>(({ isOpen, onClose, onSwitchToText, model }, ref) => {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);
  const conversationRef = useRef<Array<{ role: string; content: string }>>([]);
  const speechQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

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
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
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

  const startListening = useCallback(() => {
    if (!recognitionRef.current) { setError("Speech recognition not available"); return; }
    setError(null);
    setTranscript("");
    setVoiceState("listening");
    window.speechSynthesis?.cancel();
    speechQueueRef.current = [];
    isSpeakingRef.current = false;
    try { recognitionRef.current.start(); } catch { setVoiceState("idle"); }
  }, []);

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
      {/* Top bar: Settings + Help */}
      <div className="flex items-center justify-end p-4 pt-6">
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
        <VoiceChatVisualizer state={voiceState} size={180} />
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-center gap-6 pb-4 px-6">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
          style={{ backgroundColor: "hsla(0, 0%, 20%, 0.8)" }}
        >
          <X className="h-6 w-6 text-foreground" />
        </button>

        {/* Status text */}
        <p className="text-muted-foreground text-base min-w-[120px] text-center">
          {getStatusLabel()}
        </p>

        {/* Mute toggle */}
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
