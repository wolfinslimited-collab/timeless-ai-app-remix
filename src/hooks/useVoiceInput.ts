import { useState, useCallback, useRef, useEffect } from "react";

interface UseVoiceInputOptions {
  onTranscript?: (text: string) => void;
  onError?: (error: string) => void;
  onInterimTranscript?: (text: string) => void;
  language?: string;
}

interface UseVoiceInputReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
}

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
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSpeechRecognition = (): SpeechRecognitionConstructor | undefined => {
  if (typeof window === "undefined") return undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
};

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const { onTranscript, onError, onInterimTranscript, language = "en-US" } = options;
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isListeningRef = useRef(false);
  const optionsRef = useRef(options);

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Check if Web Speech API is supported
  const isSupported = typeof window !== "undefined" && Boolean(getSpeechRecognition());

  // Initialize recognition lazily
  const initRecognition = useCallback(() => {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) return null;

    const recognition = new SpeechRecognitionClass();
    
    recognition.continuous = true; // Enable continuous recognition
    recognition.interimResults = true; // Get interim results
    recognition.lang = language;

    recognition.onstart = () => {
      console.log("[Voice] Recognition started");
      setIsListening(true);
    };

    recognition.onend = () => {
      console.log("[Voice] Recognition ended, isListeningRef:", isListeningRef.current);
      // Auto-restart if user still wants to listen (browser stops after ~5-10s silence)
      if (isListeningRef.current) {
        console.log("[Voice] Auto-restarting...");
        try {
          recognition.start();
        } catch (e) {
          console.error("[Voice] Failed to auto-restart:", e);
          isListeningRef.current = false;
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        
        if (result.isFinal) {
          finalTranscript += text;
        } else {
          interim += text;
        }
      }

      if (interim) {
        setInterimTranscript(interim);
        optionsRef.current.onInterimTranscript?.(interim);
      }

      if (finalTranscript) {
        console.log("[Voice] Final transcript:", finalTranscript);
        setTranscript(prev => prev + finalTranscript);
        setInterimTranscript("");
        optionsRef.current.onTranscript?.(finalTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("[Voice] Speech recognition error:", event.error);
      
      // Don't stop on no-speech - browser will auto-restart via onend
      if (event.error === "no-speech") {
        console.log("[Voice] No speech detected, waiting for auto-restart...");
        return;
      }

      // For other errors, stop listening
      isListeningRef.current = false;
      setIsListening(false);
      
      let errorMessage = "Speech recognition failed";
      switch (event.error) {
        case "not-allowed":
          errorMessage = "Microphone access denied. Please allow microphone access.";
          break;
        case "audio-capture":
          errorMessage = "No microphone found. Please check your microphone.";
          break;
        case "network":
          errorMessage = "Network error. Please check your connection.";
          break;
        case "aborted":
          errorMessage = "Speech recognition was aborted.";
          break;
      }
      
      optionsRef.current.onError?.(errorMessage);
    };

    return recognition;
  }, [language]);

  // CRITICAL: This function must be called directly from a user click handler
  const startListening = useCallback(() => {
    if (isListeningRef.current) {
      console.log("[Voice] Already listening");
      return;
    }
    
    // Initialize recognition lazily on first use
    if (!recognitionRef.current) {
      recognitionRef.current = initRecognition();
    }

    if (!recognitionRef.current) {
      console.error("[Voice] Speech recognition not available");
      onError?.("Speech recognition not available");
      return;
    }

    // Reset state
    setTranscript("");
    setInterimTranscript("");
    isListeningRef.current = true;
    
    try {
      console.log("[Voice] Starting recognition...");
      recognitionRef.current.start();
    } catch (error) {
      console.error("[Voice] Failed to start speech recognition:", error);
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, [initRecognition, onError]);

  const stopListening = useCallback(() => {
    console.log("[Voice] Stopping recognition...");
    isListeningRef.current = false;
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("[Voice] Failed to stop speech recognition:", error);
      }
    }
    
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        isListeningRef.current = false;
        recognitionRef.current.abort();
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    toggleListening,
  };
}
