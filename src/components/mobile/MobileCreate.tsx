import { Image, Video, Music, Clapperboard, Grid3X3, ChevronRight, Paintbrush, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePremiumPlusAccess } from "@/hooks/usePremiumPlusAccess";
import type { Screen } from "./MobileNav";

interface MobileCreateProps {
  onNavigate: (screen: Screen) => void;
}

export function MobileCreate({ onNavigate }: MobileCreateProps) {
  const { hasPremiumPlusAccess } = usePremiumPlusAccess();

  return (
    <div className="px-4 py-2">
      <h1 className="text-foreground text-2xl font-bold mb-2">Create</h1>
      <p className="text-muted-foreground text-sm mb-6">What would you like to create?</p>

      <div className="space-y-4">
        {/* Visual Styles Card (Featured) */}
        <CreateOption 
          icon={Paintbrush} 
          title="Trending Styles" 
          description="Ultra-realistic fashion visuals with AI styling"
          badge="NEW"
          onClick={() => onNavigate("visual-styles")}
        />

        {/* Shots Tool Card - matching Flutter */}
        <CreateOption 
          icon={Grid3X3} 
          title="Shots" 
          description="Upload 1 image → Get 9 cinematic angles"
          onClick={() => onNavigate("image")}
        />

        {/* Image Generation Card */}
        <CreateOption 
          icon={Image} 
          title="Image Generation" 
          description="Create stunning images with AI"
          onClick={() => onNavigate("image")}
        />

        {/* Video Generation Card */}
        <CreateOption 
          icon={Video} 
          title="Video Generation" 
          description="Generate videos from text or images"
          onClick={() => onNavigate("video")}
        />

        {/* Audio/Music Generation Card */}
        <CreateOption 
          icon={Music} 
          title="Music & Audio" 
          description="Generate music, vocals, and sound effects"
          onClick={() => onNavigate("audio")}
        />


        {/* Cinema Studio Card - Premium Plus locked */}
        <CreateOption 
          icon={Clapperboard} 
          title="Cinema Studio" 
          description="Professional video creation workspace"
          onClick={() => onNavigate("cinema")}
          locked={!hasPremiumPlusAccess}
          lockBadge="PREMIUM+"
        />
      </div>
    </div>
  );
}

function CreateOption({ 
  icon: Icon, 
  title, 
  description, 
  badge,
  locked,
  lockBadge,
  onClick 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  title: string; 
  description: string; 
  badge?: string;
  locked?: boolean;
  lockBadge?: string;
  onClick?: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-5 bg-card rounded-2xl border border-border hover:bg-card/80 transition-all",
        locked && "opacity-80"
      )}
    >
      <div className={cn(
        "w-14 h-14 rounded-xl flex items-center justify-center",
        "bg-secondary"
      )}>
        <Icon className="w-7 h-7 text-foreground" />
      </div>
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <h3 className="text-foreground font-bold text-lg">{title}</h3>
          {badge && (
            <span className="px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
              {badge}
            </span>
          )}
          {locked && lockBadge && (
            <span className="px-2 py-0.5 bg-secondary text-muted-foreground text-[10px] font-bold rounded-full flex items-center gap-1">
              <Lock className="w-3 h-3" />
              {lockBadge}
            </span>
          )}
        </div>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    </button>
  );
}
