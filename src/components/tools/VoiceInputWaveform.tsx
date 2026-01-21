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
  
  // Smoothed values for interpolation
  const smoothedDataRef = useRef<number[]>([]);
  const timeRef = useRef(0);

  // Initialize audio context and microphone stream
  const initializeAudio = useCallback(async () => {
    if (isInitialized || !isListening) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.85;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Initialize smoothed data array
      smoothedDataRef.current = new Array(64).fill(0);

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
      smoothedDataRef.current = [];
      timeRef.current = 0;
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

  // Draw waveform with smooth interpolation
  useEffect(() => {
    if (!isListening || !isInitialized) return;

    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Set canvas resolution for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    // Avoid compounding scales if this effect re-runs
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const numBars = 48;
    const lerpFactor = 0.15; // Smoothing factor for interpolation

    // Canvas doesn't support modern space-separated CSS color syntax, so convert
    // our Tailwind-style HSL variables (e.g. "0 0% 98%") into comma syntax.
    const rootStyle = getComputedStyle(document.documentElement);
    const foregroundVar =
      rootStyle.getPropertyValue("--foreground").trim() || "0 0% 98%";
    const primaryVar = rootStyle.getPropertyValue("--primary").trim() || "265 90% 65%";
    const foregroundCsv = foregroundVar.replace(/\s+/g, ", ");
    const primaryCsv = primaryVar.replace(/\s+/g, ", ");

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      timeRef.current += 0.02;

      const width = rect.width;
      const height = rect.height;
      const centerY = height / 2;

      // Clear canvas with slight fade for trail effect
      ctx.clearRect(0, 0, width, height);

      // Calculate bar dimensions
      const totalBarsWidth = width * 0.75;
      const startX = (width - totalBarsWidth) / 2;
      const barWidth = 3;
      const barSpacing = (totalBarsWidth - numBars * barWidth) / (numBars - 1);

      // Process and smooth audio data
      for (let i = 0; i < numBars; i++) {
        // Sample from frequency data with some overlap
        const dataIndex = Math.floor((i / numBars) * bufferLength * 0.8);
        const rawValue = dataArray[dataIndex] / 255;
        
        // Add subtle wave animation when idle
        const idleWave = Math.sin(timeRef.current * 2 + i * 0.3) * 0.05 + 0.08;
        const targetValue = Math.max(rawValue, idleWave);
        
        // Smooth interpolation (lerp)
        smoothedDataRef.current[i] = smoothedDataRef.current[i] + 
          (targetValue - smoothedDataRef.current[i]) * lerpFactor;
      }

      // Draw glow layer
      ctx.save();
      ctx.filter = 'blur(8px)';
      ctx.globalAlpha = 0.4;
      
      for (let i = 0; i < numBars; i++) {
        const value = smoothedDataRef.current[i];
        const maxHeight = height * 0.85;
        const barHeight = Math.max(4, value * maxHeight);
        const x = startX + i * (barWidth + barSpacing);
        const halfHeight = barHeight / 2;

        ctx.fillStyle = `hsl(${primaryCsv})`;

        // Top bar
        ctx.beginPath();
        ctx.roundRect(x - 1, centerY - halfHeight, barWidth + 2, halfHeight, 2);
        ctx.fill();

        // Bottom bar (mirrored)
        ctx.beginPath();
        ctx.roundRect(x - 1, centerY, barWidth + 2, halfHeight, 2);
        ctx.fill();
      }
      ctx.restore();

      // Draw main bars
      for (let i = 0; i < numBars; i++) {
        const value = smoothedDataRef.current[i];
        const maxHeight = height * 0.85;
        const barHeight = Math.max(4, value * maxHeight);
        const x = startX + i * (barWidth + barSpacing);
        const halfHeight = barHeight / 2;

        // Create gradient for each bar
        const gradient = ctx.createLinearGradient(x, centerY - halfHeight, x, centerY + halfHeight);
        
        // Dynamic opacity based on value
        const alpha = 0.6 + value * 0.4;
        gradient.addColorStop(0, `hsla(${foregroundCsv}, ${alpha * 0.7})`);
        gradient.addColorStop(0.5, `hsla(${foregroundCsv}, ${alpha})`);
        gradient.addColorStop(1, `hsla(${foregroundCsv}, ${alpha * 0.7})`);
        
        ctx.fillStyle = gradient;

        // Top bar with rounded caps
        ctx.beginPath();
        ctx.roundRect(x, centerY - halfHeight, barWidth, halfHeight, barWidth / 2);
        ctx.fill();

        // Bottom bar (mirrored) with rounded caps
        ctx.beginPath();
        ctx.roundRect(x, centerY, barWidth, halfHeight, barWidth / 2);
        ctx.fill();
      }

      // Draw center line
      const avgValue = smoothedDataRef.current.reduce((a, b) => a + b, 0) / numBars;
      if (avgValue < 0.15) {
        const lineAlpha = 0.15 + Math.sin(timeRef.current * 3) * 0.05;
        ctx.strokeStyle = `hsla(${foregroundCsv}, ${lineAlpha})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(startX - 20, centerY);
        ctx.lineTo(startX + totalBarsWidth + 20, centerY);
        ctx.stroke();
      }
    };

    draw();
  }, [isListening, isInitialized]);

  if (!isListening) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-secondary/90 backdrop-blur-md rounded-2xl px-4 py-3 border border-border/30 shadow-lg",
        className
      )}
    >
      {/* Cancel button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0 rounded-full hover:bg-destructive/20 hover:text-destructive transition-all duration-200"
        onClick={onCancel}
      >
        <X className="h-5 w-5" />
      </Button>

      {/* Waveform visualization */}
      <div className="flex-1 relative h-14 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
        />
        {!isInitialized && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-[3px]">
              {[...Array(32)].map((_, i) => (
                <div
                  key={i}
                  className="w-[3px] bg-foreground/40 rounded-full"
                  style={{
                    height: `${Math.sin(i * 0.4) * 10 + 14}px`,
                    animation: `pulse 1.5s ease-in-out infinite`,
                    animationDelay: `${i * 30}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirm button */}
      <Button
        size="icon"
        className="h-10 w-10 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-md"
        onClick={onConfirm}
      >
        <Check className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default VoiceInputWaveform;
