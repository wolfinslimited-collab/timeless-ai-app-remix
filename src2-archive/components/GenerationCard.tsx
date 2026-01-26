import { useState } from "react";
import { Image, Video, Download, Trash2, Clock, Loader2, Music, Play, Pause } from "lucide-react";
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
  onImageClick?: (imageUrl: string, generationId: string) => void;
  onVideoClick?: (videoUrl: string, generationId: string) => void;
}

const GenerationCard = ({ gen, onDelete, onImageClick, onVideoClick }: GenerationCardProps) => {
  const [imageError, setImageError] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  const isFailed = 
    gen.status === "failed" || 
    (gen.status === "completed" && !gen.output_url && !gen.thumbnail_url) ||
    (gen.type !== "video" && imageError); // Only mark as failed for non-video types

  const hasValidUrl = gen.thumbnail_url || gen.output_url;

  // For videos, only use thumbnail_url for image preview (not video URL)
  // If no thumbnail exists, we'll use video element with preload="metadata" to show first frame
  const videoThumbnail = gen.thumbnail_url;
  const videoSource = gen.output_url || gen.thumbnail_url;

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
      <div className="aspect-video bg-secondary flex items-center justify-center overflow-hidden relative">
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
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 to-secondary p-4">
            <Music className="h-12 w-12 text-muted-foreground/50 mb-4" />
            {/* Hidden audio element */}
            <audio
              ref={(el) => setAudioRef(el)}
              src={gen.output_url}
              onPlay={() => setAudioPlaying(true)}
              onPause={() => setAudioPlaying(false)}
              onEnded={() => {
                setAudioPlaying(false);
                setAudioProgress(0);
              }}
              onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration)}
              onTimeUpdate={(e) => setAudioProgress(e.currentTarget.currentTime)}
            />
            {/* Audio controls */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (audioRef) {
                    if (audioPlaying) {
                      audioRef.pause();
                    } else {
                      audioRef.play();
                    }
                  }
                }}
                className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-200 hover:bg-white/20 hover:scale-105 shrink-0"
              >
                {audioPlaying ? (
                  <Pause className="h-3.5 w-3.5 text-white" fill="currentColor" />
                ) : (
                  <Play className="h-3.5 w-3.5 text-white ml-0.5" fill="currentColor" />
                )}
              </button>
              {/* Progress bar */}
              <div 
                className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer backdrop-blur-sm"
                onClick={(e) => {
                  if (audioRef && audioDuration) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = x / rect.width;
                    audioRef.currentTime = percentage * audioDuration;
                  }
                }}
              >
                <div 
                  className="h-full bg-white/60 rounded-full transition-all duration-100"
                  style={{ width: `${audioDuration ? (audioProgress / audioDuration) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        ) : gen.type === "video" && hasValidUrl ? (
          <div 
            className="relative w-full h-full cursor-pointer"
            onClick={() => {
              if (onVideoClick && videoSource) {
                onVideoClick(videoSource, gen.id);
              }
            }}
          >
            {/* Show thumbnail image instead of video for performance */}
            {videoThumbnail ? (
              <img
                src={videoThumbnail}
                alt={gen.title || gen.prompt}
                className="w-full h-full object-contain"
                loading="lazy"
                onError={() => setImageError(true)}
              />
            ) : (
              <video
                src={videoSource || ""}
                className="w-full h-full object-contain pointer-events-none"
                muted
                playsInline
                preload="metadata"
              />
            )}
            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center group/play">
              <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-200 group-hover/play:bg-white/20 group-hover/play:scale-110 shadow-lg">
                <Play className="h-5 w-5 text-white ml-0.5" fill="currentColor" />
              </div>
            </div>
          </div>
        ) : hasValidUrl ? (
          <img
            src={gen.thumbnail_url || gen.output_url || ""}
            alt={gen.title || gen.prompt}
            className={`w-full h-full object-contain ${onImageClick ? 'cursor-zoom-in' : ''}`}
            loading="lazy"
            onError={() => setImageError(true)}
            onClick={() => {
              const imageUrl = gen.output_url || gen.thumbnail_url;
              if (onImageClick && imageUrl) {
                onImageClick(imageUrl, gen.id);
              }
            }}
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
