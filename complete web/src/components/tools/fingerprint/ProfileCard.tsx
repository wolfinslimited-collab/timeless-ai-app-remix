import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { SocialProfile } from "./types";
import { getPlatformStyle, getConfidenceVariant } from "./types";

interface ProfileCardProps {
  profile: SocialProfile;
}

export const ProfileCard = ({ profile }: ProfileCardProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const style = getPlatformStyle(profile.platform);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await navigator.clipboard.writeText(profile.url);
      setCopied(true);
      toast({
        title: "Link copied",
        description: "Profile URL copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Could not copy link to clipboard.",
      });
    }
  };

  return (
    <a
      href={profile.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:bg-accent/50 transition-colors group"
    >
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center text-lg bg-gradient-to-br shrink-0",
        style.color
      )}>
        {style.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{profile.name}</span>
          {profile.confidence && (
            <Badge variant={getConfidenceVariant(profile.confidence)} className="text-[10px] px-1.5 py-0 shrink-0">
              {profile.confidence}
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground truncate">
          {profile.username || profile.platform}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </a>
  );
};
