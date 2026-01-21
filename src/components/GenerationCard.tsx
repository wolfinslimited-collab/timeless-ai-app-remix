import { useState } from "react";
import { Image, Video, Download, Trash2, Clock, Loader2, Bot, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import failedGenerationThumb from "@/assets/failed-generation-thumb.svg";

interface Generation {
  id: string;
  title: string | null;
  prompt: string;
  type: string;
  model: string;
  status: string;
  output_url: string | null;
  thumbnail_url: string | null;
  credits_used: number;
  created_at: string;
}

interface GenerationCardProps {
  gen: Generation;
  onDelete: (id: string) => void;
}

const GenerationCard = ({ gen, onDelete }: GenerationCardProps) => {
  const [imageError, setImageError] = useState(false);

  const isFailed = 
    gen.status === "failed" || 
    (gen.status === "completed" && !gen.output_url && !gen.thumbnail_url) ||
    imageError;

  const hasValidUrl = gen.thumbnail_url || gen.output_url;

  return (
    <div
      className={`group relative rounded-xl border bg-card overflow-hidden transition-all ${
        isFailed
          ? "border-destructive/50 hover:border-destructive" 
          : gen.status === "pending"
          ? "border-yellow-500/50 hover:border-yellow-500"
          : "border-border/50 hover:border-primary/30"
      }`}
    >
      {/* Status Badge */}
      {gen.status === "pending" && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-yellow-500/90 text-black rounded-full px-2 py-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-xs font-medium">Generating</span>
        </div>
      )}

      {/* Thumbnail */}
      <div className="aspect-video bg-secondary flex items-center justify-center overflow-hidden">
        {isFailed ? (
          <img
            src={failedGenerationThumb}
            alt="Generation failed"
            className="w-full h-full object-contain"
            loading="lazy"
            draggable={false}
          />
        ) : gen.status === "pending" ? (
          <div className="flex flex-col items-center text-muted-foreground">
            <Loader2 className="h-12 w-12 mb-2 animate-spin" />
            <span className="text-sm">Processing...</span>
          </div>
        ) : gen.type === "music" && gen.output_url ? (
          <div className="flex flex-col items-center text-muted-foreground">
            <Music className="h-12 w-12 mb-2" />
            <span className="text-sm">Audio saved</span>
          </div>
        ) : gen.type === "video" && hasValidUrl ? (
          <video
            src={gen.thumbnail_url || gen.output_url || ""}
            className="w-full h-full object-contain"
            muted
            playsInline
            preload="metadata"
            onError={() => setImageError(true)}
          />
        ) : hasValidUrl ? (
          <img
            src={gen.thumbnail_url || gen.output_url || ""}
            alt={gen.title || gen.prompt}
            className="w-full h-full object-contain"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : gen.type === "video" ? (
          <div className="flex flex-col items-center text-muted-foreground">
            <Video className="h-12 w-12 mb-2" />
            <span className="text-sm">Preview unavailable</span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-muted-foreground">
            <Image className="h-12 w-12 mb-2" />
            <span className="text-sm">Preview unavailable</span>
          </div>
        )}
      </div>

      {/* Actions overlay */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isFailed && gen.output_url && (
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 bg-background/80 backdrop-blur-sm"
            onClick={() => window.open(gen.output_url || "", "_blank")}
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
        <Button
          size="icon"
          variant="destructive"
          className="h-8 w-8"
          onClick={() => onDelete(gen.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-sm font-medium line-clamp-1 mb-1">
          {gen.title || gen.prompt}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="capitalize">{gen.model}</span>
          <span>•</span>
          {isFailed ? (
            <>
              <Clock className="h-3 w-3" />
              <span>{new Date(gen.created_at).toLocaleDateString()}</span>
            </>
          ) : gen.status === "pending" ? (
            <span className="text-yellow-500 font-medium">Processing</span>
          ) : (
            <>
              <Clock className="h-3 w-3" />
              <span>{new Date(gen.created_at).toLocaleDateString()}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerationCard;
