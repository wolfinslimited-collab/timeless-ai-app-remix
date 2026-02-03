import { useState, useRef, useCallback, useEffect } from "react";
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

// Extend window for webkit prefix

interface VoiceChatProps {
  isOpen: boolean;
  onClose: () => void;
  model: string;
}

type VoiceState = "idle" | "listening" | "processing" | "speaking";

const VoiceChat = ({ isOpen, onClose, model }: VoiceChatProps) => {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const conversationRef = useRef<Array<{ role: string; content: string }>>([]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onresult = (event) => {
          let finalTranscript = "";
          let interimTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          setTranscript(finalTranscript || interimTranscript);

          if (finalTranscript) {
            handleSendMessage(finalTranscript);
          }
        };

        recognitionRef.current.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          if (event.error !== "no-speech") {
            setError(`Speech recognition error: ${event.error}`);
          }
          setVoiceState("idle");
        };

        recognitionRef.current.onend = () => {
          if (voiceState === "listening") {
            setVoiceState("idle");
          }
        };
      } else {
        setError("Speech recognition is not supported in your browser");
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  const handleSendMessage = async (text: string) => {
    setVoiceState("processing");
    setResponse("");
    setError(null);

    try {
      // Add user message to conversation
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
            model,
            webSearch: false,
          }),
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
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Add assistant response to conversation
      if (fullResponse) {
        conversationRef.current.push({ role: "assistant", content: fullResponse });
        
        // Speak the response if not muted
        if (!isMuted) {
          speakText(fullResponse);
        } else {
          setVoiceState("idle");
        }
      } else {
        setVoiceState("idle");
      }
    } catch (err) {
      console.error("Voice chat error:", err);
      setError(err instanceof Error ? err.message : "Failed to get response");
      setVoiceState("idle");
    }
  };

  const speakText = (text: string) => {
    if (!window.speechSynthesis) {
      setError("Speech synthesis not supported");
      setVoiceState("idle");
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    setVoiceState("speaking");

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to use a natural voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha")
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      setVoiceState("idle");
    };

    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      setVoiceState("idle");
    };

    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
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

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error("Failed to start recognition:", err);
      setVoiceState("idle");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setVoiceState("idle");
  }, []);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      window.speechSynthesis?.cancel();
      if (voiceState === "speaking") {
        setVoiceState("idle");
      }
    }
  };

  const handleClose = () => {
    // Cleanup
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    window.speechSynthesis?.cancel();
    setVoiceState("idle");
    setTranscript("");
    setResponse("");
    conversationRef.current = [];
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
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
            <div className="p-4 rounded-lg bg-primary/10">
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
            Tap the microphone button to start talking
          </p>
        )}
      </div>

      {/* Mic button */}
      <div className="p-6 flex justify-center">
        <Button
          size="lg"
          onClick={voiceState === "listening" ? stopListening : startListening}
          disabled={voiceState === "processing" || voiceState === "speaking"}
          className={cn(
            "w-16 h-16 rounded-full",
            voiceState === "listening" && "bg-red-500 hover:bg-red-600"
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
};

export default VoiceChat;
