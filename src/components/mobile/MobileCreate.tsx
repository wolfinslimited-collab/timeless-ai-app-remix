import { Image, Video, Music, Clapperboard, Grid3X3, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Screen } from "./MobileNav";

interface MobileCreateProps {
  onNavigate: (screen: Screen) => void;
}

export function MobileCreate({ onNavigate }: MobileCreateProps) {
  return (
    <div className="px-4 py-2">
      <h1 className="text-white text-xl font-bold mb-2">Create</h1>
      <p className="text-gray-400 text-sm mb-6">What would you like to create?</p>

      <div className="space-y-3">
        <CreateOption 
          icon={Image} 
          title="Image" 
          description="Generate stunning images with AI"
          color="bg-blue-500"
          onClick={() => onNavigate("image")}
        />
        <CreateOption 
          icon={Video} 
          title="Video" 
          description="Create cinematic videos"
          color="bg-purple-500"
          onClick={() => onNavigate("video")}
        />
        <CreateOption 
          icon={Music} 
          title="Music" 
          description="Compose music and audio"
          color="bg-pink-500"
        />
        <CreateOption 
          icon={Clapperboard} 
          title="Cinema Studio" 
          description="Professional video editing"
          color="bg-orange-500"
          onClick={() => onNavigate("cinema")}
        />
        <CreateOption 
          icon={Grid3X3} 
          title="AI Apps" 
          description="Specialized AI tools"
          color="bg-green-500"
        />
      </div>
    </div>
  );
}

function CreateOption({ 
  icon: Icon, 
  title, 
  description, 
  color,
  onClick 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  title: string; 
  description: string; 
  color: string;
  onClick?: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
    >
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 text-left">
        <h3 className="text-white font-semibold">{title}</h3>
        <p className="text-gray-400 text-xs">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </button>
  );
}
