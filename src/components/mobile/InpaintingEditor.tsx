import { useState, useRef, useEffect, useCallback } from "react";
import { X, Brush, Eraser, RotateCcw, Loader2, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawingStroke {
  points: { x: number; y: number }[];
  brushSize: number;
  isErase: boolean;
}

interface InpaintingEditorProps {
  imageUrl: string;
  mode: "inpainting" | "object-erase";
  onClose: () => void;
  onDone: (maskDataUrl: string, prompt: string) => void;
  isProcessing: boolean;
}

export function InpaintingEditor({
  imageUrl,
  mode,
  onClose,
  onDone,
  isProcessing,
}: InpaintingEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<DrawingStroke | null>(null);
  const [brushSize, setBrushSize] = useState(30);
  const [isPaintMode, setIsPaintMode] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Load the image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setLoadedImage(img);
    img.src = imageUrl;
  }, [imageUrl]);

  // Set canvas size from container
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ width, height });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Calculate image display transform
  const getImageTransform = useCallback(() => {
    if (!loadedImage || !canvasSize.width || !canvasSize.height) return null;
    const scaleX = canvasSize.width / loadedImage.naturalWidth;
    const scaleY = canvasSize.height / loadedImage.naturalHeight;
    const scale = Math.min(scaleX, scaleY);
    const scaledW = loadedImage.naturalWidth * scale;
    const scaledH = loadedImage.naturalHeight * scale;
    const offsetX = (canvasSize.width - scaledW) / 2;
    const offsetY = (canvasSize.height - scaledH) / 2;
    return { scale, offsetX, offsetY, scaledW, scaledH };
  }, [loadedImage, canvasSize]);

  // Convert screen coords to image coords
  const screenToImageCoords = useCallback(
    (screenX: number, screenY: number) => {
      const transform = getImageTransform();
      if (!transform || !loadedImage) return null;
      const { scale, offsetX, offsetY } = transform;
      const imgX = (screenX - offsetX) / scale;
      const imgY = (screenY - offsetY) / scale;
      if (imgX < 0 || imgX > loadedImage.naturalWidth || imgY < 0 || imgY > loadedImage.naturalHeight) return null;
      return { x: imgX, y: imgY };
    },
    [getImageTransform, loadedImage]
  );

  // Draw everything on the display canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loadedImage) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    const transform = getImageTransform();
    if (!transform) return;
    const { scale, offsetX, offsetY } = transform;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the image
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    ctx.drawImage(loadedImage, 0, 0);
    ctx.restore();

    // Draw mask overlay on a temporary canvas, then composite
    const maskOverlay = document.createElement("canvas");
    maskOverlay.width = canvas.width;
    maskOverlay.height = canvas.height;
    const mCtx = maskOverlay.getContext("2d");
    if (!mCtx) return;

    mCtx.save();
    mCtx.translate(offsetX, offsetY);
    mCtx.scale(scale, scale);

    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;
    for (const stroke of allStrokes) {
      if (stroke.isErase) {
        // Erase removes from the red overlay
        mCtx.globalCompositeOperation = "destination-out";
      } else {
        mCtx.globalCompositeOperation = "source-over";
      }
      mCtx.fillStyle = stroke.isErase ? "rgba(255,0,0,1)" : "rgba(255,0,0,0.5)";
      for (const point of stroke.points) {
        mCtx.beginPath();
        mCtx.arc(point.x, point.y, stroke.brushSize / 2, 0, Math.PI * 2);
        mCtx.fill();
      }
    }
    mCtx.restore();

    // Composite the mask overlay onto the main canvas
    ctx.drawImage(maskOverlay, 0, 0);
  }, [loadedImage, strokes, currentStroke, canvasSize, getImageTransform]);

  // Generate mask as data URL
  const generateMask = useCallback((): string | null => {
    if (!loadedImage) return null;
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return null;
    const w = loadedImage.naturalWidth;
    const h = loadedImage.naturalHeight;
    maskCanvas.width = w;
    maskCanvas.height = h;
    const ctx = maskCanvas.getContext("2d");
    if (!ctx) return null;

    // Black background (unmasked)
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);

    // Draw strokes
    for (const stroke of strokes) {
      ctx.fillStyle = stroke.isErase ? "#000000" : "#ffffff";
      for (const point of stroke.points) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, stroke.brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return maskCanvas.toDataURL("image/png");
  }, [loadedImage, strokes]);

  // Pointer handlers
  const getCanvasPoint = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return screenToImageCoords(x, y);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (!point) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setCurrentStroke({ points: [point], brushSize, isErase: !isPaintMode });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!currentStroke) return;
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (!point) return;
    setCurrentStroke((prev) =>
      prev ? { ...prev, points: [...prev.points, point] } : null
    );
  };

  const handlePointerUp = () => {
    if (currentStroke) {
      setStrokes((prev) => [...prev, currentStroke]);
      setCurrentStroke(null);
    }
  };

  const handleDone = () => {
    if (strokes.length === 0) return;
    const mask = generateMask();
    if (!mask) return;
    onDone(mask, prompt || (mode === "inpainting" ? "seamless blend" : "remove object"));
  };

  const hasStrokes = strokes.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top toolbar */}
      <div className="flex items-center px-3 py-2 shrink-0">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center">
          <X className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1 text-center">
          <span className="text-white font-semibold text-base">
            {mode === "inpainting" ? "Inpainting" : "Object Erase"}
          </span>
        </div>
        <button
          onClick={handleDone}
          disabled={!hasStrokes || isProcessing}
          className="px-4 py-2 text-white font-semibold text-sm disabled:opacity-40"
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          ) : (
            "Done"
          )}
        </button>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 min-h-0 relative touch-none">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: "none" }}
        />
      </div>

      {/* Bottom toolbar */}
      <div className="px-4 py-3 shrink-0 space-y-3">
        {/* Tool buttons */}
        <div className="flex items-center justify-center gap-5">
          <button
            onClick={() => setIsPaintMode(true)}
            className="flex flex-col items-center gap-1"
          >
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                isPaintMode ? "bg-white" : "bg-white/10"
              )}
            >
              <Brush className={cn("w-5 h-5", isPaintMode ? "text-black" : "text-white")} />
            </div>
            <span className={cn("text-xs", isPaintMode ? "text-white" : "text-white/50")}>Paint</span>
          </button>
          <button
            onClick={() => setIsPaintMode(false)}
            className="flex flex-col items-center gap-1"
          >
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                !isPaintMode ? "bg-white" : "bg-white/10"
              )}
            >
              <Eraser className={cn("w-5 h-5", !isPaintMode ? "text-black" : "text-white")} />
            </div>
            <span className={cn("text-xs", !isPaintMode ? "text-white" : "text-white/50")}>Erase</span>
          </button>
          <button
            onClick={() => { setStrokes([]); setCurrentStroke(null); }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10">
              <RotateCcw className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs text-white/50">Clear</span>
          </button>
        </div>

        {/* Brush size slider */}
        <div className="flex items-center gap-3">
          <Minus className="w-3 h-3 text-white/50" />
          <input
            type="range"
            min={5}
            max={100}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="flex-1 accent-primary h-1"
          />
          <Plus className="w-5 h-5 text-white/50" />
        </div>
        <p className="text-white/40 text-xs text-center">Brush: {brushSize}px</p>

        {/* Prompt input (inpainting only) */}
        {mode === "inpainting" && (
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What to generate in masked area..."
            className="w-full px-4 py-3 rounded-xl bg-white/10 text-white text-sm placeholder:text-white/40 outline-none"
          />
        )}
      </div>

      {/* Hidden mask canvas */}
      <canvas ref={maskCanvasRef} className="hidden" />
    </div>
  );
}
