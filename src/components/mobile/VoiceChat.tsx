import { useState, useRef, useCallback, useEffect, forwardRef } from "react";
import { Mic, MicOff, Volume2, VolumeX, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

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
  model: string;
}

type VoiceState = "idle" | "listening" | "processing" | "speaking";

// Fast model for voice chat - optimized for low latency
const VOICE_MODEL = "gemini-3-flash";

const VoiceChat = forwardRef<HTMLDivElement, VoiceChatProps>(({ isOpen, onClose, model }, ref) => {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  
  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);
  const conversationRef = useRef<Array<{ role: string; content: string }>>([]);
  const speechQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  // Load and select the best available voice
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis?.getVoices() || [];
      
      // Priority order for natural-sounding voices
      const voicePriority = [
        (v: SpeechSynthesisVoice) => v.name.includes("Google") && v.lang.startsWith("en"),
        (v: SpeechSynthesisVoice) => v.name.includes("Natural") && v.lang.startsWith("en"),
        (v: SpeechSynthesisVoice) => v.name === "Samantha",
        (v: SpeechSynthesisVoice) => v.name.includes("Enhanced") && v.lang.startsWith("en"),
        (v: SpeechSynthesisVoice) => (v.name.includes("Premium") || v.name.includes("Neural")) && v.lang.startsWith("en"),
        (v: SpeechSynthesisVoice) => v.lang.startsWith("en"),
      ];
      
      for (const matcher of voicePriority) {
        const voice = voices.find(matcher);
        if (voice) {
          setSelectedVoice(voice);
          console.log("Selected voice:", voice.name, voice.lang);
          break;
        }
      }
    };

    loadVoices();
    
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Initialize speech recognition with optimized settings
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true; // Keep listening
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onresult = (event) => {
          // Clear silence timeout on any speech
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }

          let finalTranscript = "";
          let interimTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
            } else {
              interimTranscript += result[0].transcript;
            }
          }

          // Show what user is saying in real-time
          setTranscript(finalTranscript || interimTranscript);

          if (finalTranscript) {
            // Set a short silence timeout to detect end of speech
            silenceTimeoutRef.current = setTimeout(() => {
              if (recognitionRef.current) {
                recognitionRef.current.stop();
              }
              handleSendMessage(finalTranscript.trim());
            }, 800); // Wait 800ms of silence before sending
          }
        };

        recognitionRef.current.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          if (event.error !== "no-speech" && event.error !== "aborted") {
            setError(`Speech error: ${event.error}`);
          }
          setVoiceState("idle");
        };

        recognitionRef.current.onend = () => {
          // Only reset if we're still in listening mode (not processing)
          if (voiceState === "listening") {
            setVoiceState("idle");
          }
        };
      } else {
        setError("Speech recognition not supported");
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Speak the next chunk in the queue
  const speakNextChunk = useCallback(() => {
    if (!window.speechSynthesis || isMuted) {
      isSpeakingRef.current = false;
      return;
    }

    const nextText = speechQueueRef.current.shift();
    if (!nextText) {
      isSpeakingRef.current = false;
      // Check if we should auto-restart listening
      if (voiceState === "speaking" && speechQueueRef.current.length === 0) {
        setVoiceState("idle");
        setTimeout(() => startListening(), 300);
      }
      return;
    }

    isSpeakingRef.current = true;
    setVoiceState("speaking");

    const utterance = new SpeechSynthesisUtterance(nextText);
    utterance.rate = 1.1; // Slightly faster for snappier feel
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      speakNextChunk(); // Speak next chunk
    };

    utterance.onerror = () => {
      speakNextChunk(); // Try next chunk on error
    };

    currentUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [selectedVoice, isMuted, voiceState]);

  // Add text to speech queue - split by sentences for streaming speech
  const queueSpeech = useCallback((text: string) => {
    // Clean text for speech
    const cleaned = text
      .replace(/```[\s\S]*?```/g, "code block")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/#{1,6}\s/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();

    if (!cleaned) return;

    speechQueueRef.current.push(cleaned);

    // Start speaking if not already
    if (!isSpeakingRef.current && !isMuted) {
      speakNextChunk();
    }
  }, [speakNextChunk, isMuted]);

  const handleSendMessage = async (text: string) => {
    setVoiceState("processing");
    setResponse("");
    setError(null);
    speechQueueRef.current = [];

    // Abort any previous stream
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
    }
    streamAbortRef.current = new AbortController();

    try {
      conversationRef.current.push({ role: "user", content: text });

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            messages: conversationRef.current,
            model: VOICE_MODEL, // Always use fast model for voice
            webSearch: false,
          }),
          signal: streamAbortRef.current.signal,
        }
      );

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";
      let sentenceBuffer = "";

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

              // Stream speech: queue complete sentences
              sentenceBuffer += content;
              
              // Check for sentence boundaries
              const sentenceMatch = sentenceBuffer.match(/^(.*?[.!?])\s*/);
              if (sentenceMatch) {
                const sentence = sentenceMatch[1];
                sentenceBuffer = sentenceBuffer.slice(sentenceMatch[0].length);
                queueSpeech(sentence);
              }
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Speak any remaining text
      if (sentenceBuffer.trim()) {
        queueSpeech(sentenceBuffer.trim());
      }

      // Add to conversation history
      if (fullResponse) {
        conversationRef.current.push({ role: "assistant", content: fullResponse });
      }

      // If muted or nothing to speak, go back to idle
      if (isMuted || speechQueueRef.current.length === 0) {
        setVoiceState("idle");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return; // Ignore abort errors
      }
      console.error("Voice chat error:", err);
      setError(err instanceof Error ? err.message : "Failed to get response");
      setVoiceState("idle");
    }
  };

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError("Speech recognition not available");
      return;
    }

    setError(null);
    setTranscript("");
    setVoiceState("listening");

    // Stop any ongoing speech
    window.speechSynthesis?.cancel();
    speechQueueRef.current = [];
    isSpeakingRef.current = false;

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error("Failed to start recognition:", err);
      setVoiceState("idle");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setVoiceState("idle");
  }, []);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      window.speechSynthesis?.cancel();
      speechQueueRef.current = [];
      isSpeakingRef.current = false;
      if (voiceState === "speaking") {
        setVoiceState("idle");
      }
    }
  };

  const handleClose = () => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
    }
    window.speechSynthesis?.cancel();
    speechQueueRef.current = [];
    isSpeakingRef.current = false;
    setVoiceState("idle");
    setTranscript("");
    setResponse("");
    conversationRef.current = [];
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div ref={ref} className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              voiceState === "idle" && "bg-muted-foreground",
              voiceState === "listening" && "bg-green-500 animate-pulse",
              voiceState === "processing" && "bg-yellow-500 animate-pulse",
              voiceState === "speaking" && "bg-primary animate-pulse"
            )}
          />
          <span className="text-sm font-medium capitalize">
            {voiceState === "idle" ? "Ready" : voiceState}
          </span>
          <span className="text-xs text-muted-foreground">• Flash mode</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="h-8 w-8"
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
        {/* Visualization */}
        <div className="relative">
          <div
            className={cn(
              "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300",
              voiceState === "idle" && "bg-secondary",
              voiceState === "listening" && "bg-green-500/20 ring-4 ring-green-500/40",
              voiceState === "processing" && "bg-yellow-500/20",
              voiceState === "speaking" && "bg-primary/20 ring-4 ring-primary/40"
            )}
          >
            {voiceState === "processing" ? (
              <Loader2 className="h-12 w-12 text-yellow-500 animate-spin" />
            ) : voiceState === "listening" ? (
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-green-500 rounded-full animate-pulse"
                    style={{
                      height: `${20 + Math.random() * 30}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            ) : voiceState === "speaking" ? (
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-primary rounded-full animate-pulse"
                    style={{
                      height: `${20 + Math.random() * 30}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            ) : (
              <Mic className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Transcript / Response */}
        <div className="w-full max-w-md text-center space-y-4">
          {transcript && (
            <div className="p-4 rounded-lg bg-secondary/50">
              <p className="text-sm text-muted-foreground mb-1">You said:</p>
              <p className="text-foreground">{transcript}</p>
            </div>
          )}
          {response && (
            <div className="p-4 rounded-lg bg-primary/10 max-h-48 overflow-y-auto">
              <p className="text-sm text-muted-foreground mb-1">AI response:</p>
              <p className="text-foreground text-sm">{response}</p>
            </div>
          )}
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        {voiceState === "idle" && !transcript && !response && (
          <p className="text-muted-foreground text-sm text-center">
            Tap the microphone to start talking
          </p>
        )}
      </div>

      {/* Mic button */}
      <div className="p-6 flex justify-center">
        <Button
          size="lg"
          onClick={voiceState === "listening" ? stopListening : startListening}
          disabled={voiceState === "processing"}
          className={cn(
            "w-16 h-16 rounded-full",
            voiceState === "listening" && "bg-red-500 hover:bg-red-600",
            voiceState === "speaking" && "bg-primary/50"
          )}
        >
          {voiceState === "listening" ? (
            <MicOff className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>
      </div>
    </div>
  );
});

VoiceChat.displayName = "VoiceChat";

export default VoiceChat;
