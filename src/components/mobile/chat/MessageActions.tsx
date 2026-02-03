import { useState } from "react";
import { RotateCcw, ThumbsUp, ThumbsDown, Copy, MoreHorizontal, Check, Share2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MessageActionsProps {
  content: string;
  onRetry?: () => void;
  onLike?: () => void;
  onDislike?: () => void;
}

export function MessageActions({ content, onRetry, onLike, onDislike }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "AI Response",
          text: content,
        });
      } catch (error) {
        // User cancelled or share failed - fallback to copy
        if ((error as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(content);
          toast.success("Copied to clipboard");
        }
      }
    } else {
      // Fallback for browsers without Web Share API
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
    }
  };

  const handleLike = () => {
    setLiked(liked === true ? null : true);
    onLike?.();
  };

  const handleDislike = () => {
    setLiked(liked === false ? null : false);
    onDislike?.();
  };

  return (
    <div className="flex items-center gap-1 mt-2 -ml-1">
      {/* Retry */}
      <button
        onClick={onRetry}
        className="p-1.5 rounded-md hover:bg-background/60 transition-colors group"
        title="Retry"
      >
        <RotateCcw className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>

      {/* Like */}
      <button
        onClick={handleLike}
        className={cn(
          "p-1.5 rounded-md hover:bg-background/60 transition-colors group",
          liked === true && "bg-primary/10"
        )}
        title="Good response"
      >
        <ThumbsUp 
          className={cn(
            "w-4 h-4 transition-colors",
            liked === true 
              ? "text-primary fill-primary" 
              : "text-muted-foreground group-hover:text-foreground"
          )} 
        />
      </button>

      {/* Dislike */}
      <button
        onClick={handleDislike}
        className={cn(
          "p-1.5 rounded-md hover:bg-background/60 transition-colors group",
          liked === false && "bg-destructive/10"
        )}
        title="Bad response"
      >
        <ThumbsDown 
          className={cn(
            "w-4 h-4 transition-colors",
            liked === false 
              ? "text-destructive fill-destructive" 
              : "text-muted-foreground group-hover:text-foreground"
          )} 
        />
      </button>

      {/* Copy */}
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-md hover:bg-background/60 transition-colors group"
        title={copied ? "Copied!" : "Copy"}
      >
        {copied ? (
          <Check className="w-4 h-4 text-primary" />
        ) : (
          <Copy className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        )}
      </button>

      {/* More options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-1.5 rounded-md hover:bg-background/60 transition-colors group"
            title="More options"
          >
            <MoreHorizontal className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[140px]">
          <DropdownMenuItem onClick={handleShare} className="gap-2 cursor-pointer">
            <Share2 className="w-4 h-4" />
            Share
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
