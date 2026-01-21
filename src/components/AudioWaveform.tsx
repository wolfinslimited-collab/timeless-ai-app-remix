import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AudioWaveformProps {
  audioUrl: string;
  isPlaying: boolean;
  onPlayPause: () => void;
  className?: string;
}

const AudioWaveform = ({ audioUrl, isPlaying, onPlayPause, className }: AudioWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Initialize audio context and analyzer
  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
    });

    audio.addEventListener("timeupdate", () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener("ended", () => {
      onPlayPause();
    });

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      audio.pause();
      audio.src = "";
    };
  }, [audioUrl]);

  // Handle play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      // Initialize audio context on first play (required by browsers)
      if (!audioContextRef.current) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = audioContext.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        sourceRef.current = source;
      }

      audio.play();
      drawWaveform();
    } else {
      audio.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [isPlaying]);

  const drawWaveform = () => {
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

      // Draw bars
      const barCount = 40;
      const barWidth = width / barCount - 2;
      const barSpacing = 2;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * bufferLength);
        const value = dataArray[dataIndex];
        const barHeight = (value / 255) * height * 0.8;
        
        const x = i * (barWidth + barSpacing);
        const y = (height - barHeight) / 2;

        // Create gradient for each bar
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, "hsl(var(--primary))");
        gradient.addColorStop(1, "hsl(var(--primary) / 0.5)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    };

    draw();
  };

  // Draw static waveform when not playing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isPlaying) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Draw static bars
    const barCount = 40;
    const barWidth = width / barCount - 2;
    const barSpacing = 2;

    for (let i = 0; i < barCount; i++) {
      // Create a pseudo-random but consistent pattern
      const seed = Math.sin(i * 0.5) * 0.5 + 0.5;
      const barHeight = seed * height * 0.4 + height * 0.1;
      
      const x = i * (barWidth + barSpacing);
      const y = (height - barHeight) / 2;

      ctx.fillStyle = "hsl(var(--primary) / 0.3)";
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 2);
      ctx.fill();
    }
  }, [isPlaying, audioUrl]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={cn("flex flex-col gap-3 w-full", className)}>
      {/* Waveform visualization */}
      <div className="relative w-full h-20 bg-secondary/50 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={320}
          height={80}
          className="w-full h-full"
        />
        {/* Progress overlay */}
        <div 
          className="absolute top-0 left-0 h-full bg-primary/10 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Time display */}
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Progress bar */}
      <div 
        className="w-full h-1 bg-secondary rounded-full cursor-pointer overflow-hidden"
        onClick={(e) => {
          const audio = audioRef.current;
          if (!audio || !duration) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const percent = x / rect.width;
          audio.currentTime = percent * duration;
        }}
      >
        <div 
          className="h-full bg-primary rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default AudioWaveform;
