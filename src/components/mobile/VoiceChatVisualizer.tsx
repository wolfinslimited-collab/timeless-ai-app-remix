import { useEffect, useRef, forwardRef } from "react";
import { cn } from "@/lib/utils";

type VoiceState = "idle" | "listening" | "processing" | "speaking";

interface VoiceChatVisualizerProps {
  state: VoiceState;
  size?: number;
}

export const VoiceChatVisualizer = forwardRef<HTMLDivElement, VoiceChatVisualizerProps>(
  ({ state, size = 200 }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const phaseRef = useRef(0);
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    hue: number;
  }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = 2;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const baseRadius = size * 0.28;

    // Initialize particles for the sphere
    if (particlesRef.current.length === 0) {
      for (let i = 0; i < 300; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * baseRadius;
        particlesRef.current.push({
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2.5 + 0.5,
          alpha: Math.random() * 0.8 + 0.2,
          hue: 25 + Math.random() * 30, // warm golden range
        });
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, size, size);
      phaseRef.current += 0.015;
      const phase = phaseRef.current;

      // Background radial glow (warm amber)
      const bgGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
      bgGlow.addColorStop(0, "hsla(30, 80%, 20%, 0.4)");
      bgGlow.addColorStop(0.5, "hsla(25, 60%, 10%, 0.2)");
      bgGlow.addColorStop(1, "hsla(0, 0%, 0%, 0)");
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, size, size);

      // Pulsing ring ripples (subtle)
      const pulseIntensity = state === "listening" ? 1 : state === "speaking" ? 0.7 : 0.3;
      for (let ring = 0; ring < 3; ring++) {
        const ringPhase = phase * 1.5 + ring * 1.2;
        const ringExpand = (Math.sin(ringPhase) * 0.5 + 0.5);
        const ringRadius = baseRadius + 20 + ringExpand * 30 + ring * 15;
        const ringAlpha = (0.15 - ring * 0.04) * pulseIntensity * (1 - ringExpand * 0.5);
        
        ctx.strokeStyle = `hsla(35, 80%, 50%, ${ringAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Main sphere glow
      const sphereGlow = ctx.createRadialGradient(cx, cy, baseRadius * 0.3, cx, cy, baseRadius * 1.3);
      sphereGlow.addColorStop(0, "hsla(35, 90%, 60%, 0.25)");
      sphereGlow.addColorStop(0.6, "hsla(30, 80%, 40%, 0.1)");
      sphereGlow.addColorStop(1, "hsla(25, 60%, 20%, 0)");
      ctx.fillStyle = sphereGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Animate particles within sphere
      const speedMultiplier = state === "listening" ? 2.5 : state === "speaking" ? 2.0 : state === "processing" ? 3.0 : 0.5;
      const breathe = Math.sin(phase * 0.8) * 5 * (state === "idle" ? 1 : 0.3);

      particlesRef.current.forEach((p) => {
        // Move particles
        p.x += p.vx * speedMultiplier;
        p.y += p.vy * speedMultiplier;

        // Keep within sphere
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxR = baseRadius + breathe;
        
        if (dist > maxR) {
          // Bounce back toward center
          const angle = Math.atan2(dy, dx);
          p.x = cx + Math.cos(angle) * (maxR - 2);
          p.y = cy + Math.sin(angle) * (maxR - 2);
          p.vx = -p.vx * 0.8 + (Math.random() - 0.5) * 0.3;
          p.vy = -p.vy * 0.8 + (Math.random() - 0.5) * 0.3;
        }

        // Random jitter
        p.vx += (Math.random() - 0.5) * 0.1;
        p.vy += (Math.random() - 0.5) * 0.1;
        
        // Damping
        p.vx *= 0.98;
        p.vy *= 0.98;

        // Oscillate alpha
        const alphaOsc = Math.sin(phase * 2 + p.hue) * 0.3;
        const finalAlpha = Math.max(0.1, Math.min(1, p.alpha + alphaOsc));

        // Draw particle with warm golden glow
        const particleGlow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.5);
        particleGlow.addColorStop(0, `hsla(${p.hue}, 90%, 70%, ${finalAlpha})`);
        particleGlow.addColorStop(0.5, `hsla(${p.hue}, 80%, 55%, ${finalAlpha * 0.4})`);
        particleGlow.addColorStop(1, `hsla(${p.hue}, 70%, 40%, 0)`);
        
        ctx.fillStyle = particleGlow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Core bright dot
        ctx.fillStyle = `hsla(${p.hue}, 95%, 85%, ${finalAlpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      });

      // Sphere border glow
      const borderGrad = ctx.createRadialGradient(cx, cy, baseRadius - 3 + breathe, cx, cy, baseRadius + 6 + breathe);
      borderGrad.addColorStop(0, "hsla(35, 80%, 50%, 0)");
      borderGrad.addColorStop(0.5, `hsla(35, 80%, 50%, ${0.15 + Math.sin(phase) * 0.05})`);
      borderGrad.addColorStop(1, "hsla(35, 80%, 50%, 0)");
      ctx.fillStyle = borderGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius + 6 + breathe, 0, Math.PI * 2);
      ctx.fill();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [state, size]);

    return (
      <div ref={ref} className="relative flex items-center justify-center">
        <canvas ref={canvasRef} />
      </div>
    );
  }
);

VoiceChatVisualizer.displayName = "VoiceChatVisualizer";
