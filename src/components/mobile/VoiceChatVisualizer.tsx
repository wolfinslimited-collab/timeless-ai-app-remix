import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type VoiceState = "idle" | "listening" | "processing" | "speaking";

interface VoiceChatVisualizerProps {
  state: VoiceState;
}

export function VoiceChatVisualizer({ state }: VoiceChatVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 160;
    canvas.width = size * 2; // For retina
    canvas.height = size * 2;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(2, 2);

    const centerX = size / 2;
    const centerY = size / 2;
    const baseRadius = 50;

    const animate = () => {
      ctx.clearRect(0, 0, size, size);
      phaseRef.current += 0.02;

      if (state === "idle") {
        // Subtle breathing effect
        const breathe = Math.sin(phaseRef.current * 0.5) * 3;
        
        // Outer glow
        const gradient = ctx.createRadialGradient(
          centerX, centerY, baseRadius - 10 + breathe,
          centerX, centerY, baseRadius + 20 + breathe
        );
        gradient.addColorStop(0, "hsla(265, 90%, 65%, 0.3)");
        gradient.addColorStop(1, "hsla(265, 90%, 65%, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius + 20 + breathe, 0, Math.PI * 2);
        ctx.fill();

        // Main circle
        ctx.fillStyle = "hsl(240, 10%, 16%)";
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius + breathe, 0, Math.PI * 2);
        ctx.fill();

      } else if (state === "listening") {
        // Dynamic pulsing rings
        for (let ring = 0; ring < 3; ring++) {
          const ringPhase = phaseRef.current * 2 + ring * 0.5;
          const ringRadius = baseRadius + Math.sin(ringPhase) * 8 + ring * 12;
          const alpha = 0.3 - ring * 0.1;
          
          ctx.strokeStyle = `hsla(142, 71%, 45%, ${alpha})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Animated waveform around circle
        ctx.strokeStyle = "hsl(142, 71%, 45%)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
          const wave = Math.sin(angle * 8 + phaseRef.current * 4) * 6;
          const r = baseRadius + wave;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;
          if (angle === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();

        // Inner glow
        const innerGlow = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, baseRadius
        );
        innerGlow.addColorStop(0, "hsla(142, 71%, 45%, 0.2)");
        innerGlow.addColorStop(1, "hsla(142, 71%, 45%, 0.05)");
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
        ctx.fill();

      } else if (state === "processing") {
        // Spinning loader effect
        const segments = 12;
        for (let i = 0; i < segments; i++) {
          const angle = (i / segments) * Math.PI * 2 + phaseRef.current * 3;
          const alpha = ((i / segments) + Math.sin(phaseRef.current * 2)) % 1;
          
          ctx.strokeStyle = `hsla(45, 100%, 55%, ${alpha * 0.8})`;
          ctx.lineWidth = 4;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.arc(centerX, centerY, baseRadius, angle, angle + 0.3);
          ctx.stroke();
        }

        // Center dot
        ctx.fillStyle = "hsla(45, 100%, 55%, 0.5)";
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
        ctx.fill();

      } else if (state === "speaking") {
        // Smooth morphing blob effect
        const points = 64;
        
        // Outer glow
        const outerGlow = ctx.createRadialGradient(
          centerX, centerY, baseRadius - 10,
          centerX, centerY, baseRadius + 30
        );
        outerGlow.addColorStop(0, "hsla(265, 90%, 65%, 0.4)");
        outerGlow.addColorStop(1, "hsla(265, 90%, 65%, 0)");
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius + 30, 0, Math.PI * 2);
        ctx.fill();

        // Morphing shape
        ctx.fillStyle = "hsla(265, 90%, 65%, 0.15)";
        ctx.strokeStyle = "hsl(265, 90%, 65%)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          // Multiple sine waves for organic movement
          const wave1 = Math.sin(angle * 3 + phaseRef.current * 2) * 8;
          const wave2 = Math.sin(angle * 5 - phaseRef.current * 3) * 4;
          const wave3 = Math.sin(angle * 2 + phaseRef.current) * 6;
          const r = baseRadius + wave1 + wave2 + wave3;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner pulse
        const pulseSize = 20 + Math.sin(phaseRef.current * 4) * 5;
        const innerPulse = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, pulseSize
        );
        innerPulse.addColorStop(0, "hsla(265, 90%, 75%, 0.6)");
        innerPulse.addColorStop(1, "hsla(265, 90%, 65%, 0)");
        ctx.fillStyle = innerPulse;
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseSize, 0, Math.PI * 2);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [state]);

  return (
    <div className="relative flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className={cn(
          "transition-opacity duration-500",
          state === "idle" ? "opacity-60" : "opacity-100"
        )}
      />
    </div>
  );
}
