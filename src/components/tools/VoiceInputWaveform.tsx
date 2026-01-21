import { useEffect, useRef, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceInputWaveformProps {
  isListening: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  className?: string;
}

const VoiceInputWaveform = ({
  isListening,
  onCancel,
  onConfirm,
  className,
}: VoiceInputWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize audio context and microphone stream
  const initializeAudio = useCallback(async () => {
    if (isInitialized || !isListening) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.7;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      setIsInitialized(true);
    } catch (error) {
      console.error("Failed to access microphone:", error);
    }
  }, [isListening, isInitialized]);

  useEffect(() => {
    if (isListening) {
      initializeAudio();
    } else {
      // Cleanup when not listening
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      setIsInitialized(false);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isListening, initializeAudio]);

  // Draw waveform
  useEffect(() => {
    if (!isListening || !isInitialized) return;

    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Calculate center
      const centerY = height / 2;

      // Draw waveform bars (centered, mirrored)
      const barCount = 50;
      const totalWidth = width * 0.7;
      const startX = (width - totalWidth) / 2;
      const barWidth = (totalWidth / barCount) * 0.6;
      const barGap = (totalWidth / barCount) * 0.4;

      for (let i = 0; i < barCount; i++) {
        // Sample from the frequency data
        const dataIndex = Math.floor((i / barCount) * bufferLength);
        const value = dataArray[dataIndex];
        
        // Add some minimum height and variation
        const normalizedValue = Math.max(0.1, value / 255);
        const maxBarHeight = height * 0.8;
        const barHeight = normalizedValue * maxBarHeight;

        const x = startX + i * (barWidth + barGap);
        const halfHeight = barHeight / 2;

        // Draw mirrored bars (top and bottom from center)
        ctx.fillStyle = "hsl(var(--foreground) / 0.8)";
        
        // Top half
        ctx.beginPath();
        ctx.roundRect(x, centerY - halfHeight, barWidth, halfHeight, 1);
        ctx.fill();
        
        // Bottom half
        ctx.beginPath();
        ctx.roundRect(x, centerY, barWidth, halfHeight, 1);
        ctx.fill();
      }

      // Draw dotted line on sides when there's low audio
      const avgValue = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
      if (avgValue < 30) {
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = "hsl(var(--foreground) / 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(10, centerY);
        ctx.lineTo(startX - 10, centerY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(startX + totalWidth + 10, centerY);
        ctx.lineTo(width - 10, centerY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    draw();
  }, [isListening, isInitialized]);

  if (!isListening) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-secondary/80 backdrop-blur-sm rounded-xl px-4 py-3 border border-border/50",
        className
      )}
    >
      {/* Waveform visualization */}
      <div className="flex-1 relative h-12 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={400}
          height={48}
          className="w-full h-full"
        />
        {!isInitialized && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-1">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-foreground/30 rounded-full animate-pulse"
                  style={{
                    height: `${Math.sin(i * 0.5) * 12 + 16}px`,
                    animationDelay: `${i * 50}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cancel button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0 rounded-full hover:bg-destructive/20 hover:text-destructive"
        onClick={onCancel}
      >
        <X className="h-5 w-5" />
      </Button>

      {/* Confirm button */}
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 shrink-0 rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        onClick={onConfirm}
      >
        <Check className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default VoiceInputWaveform;