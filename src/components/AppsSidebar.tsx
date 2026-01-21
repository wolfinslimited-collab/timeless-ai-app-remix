import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, LucideIcon } from "lucide-react";
import { 
  ImagePlus, 
  Maximize2, 
  Paintbrush, 
  Sun, 
  RotateCcw, 
  Sparkles,
  Scissors,
  Eraser,
  Palette,
  Layers,
  Video,
  Film,
  Clapperboard,
  Wand2,
  Music,
  Mic,
  SlidersHorizontal,
  Volume2,
  Camera,
  Move3d,
  Focus,
  Aperture
} from "lucide-react";

export type AppId = 
  | "generate" | "upscale" | "inpainting" | "relight" | "angle" 
  | "skin-enhancer" | "background-remove" | "object-erase" | "colorize" | "style-transfer"
  | "extend" | "interpolate" | "lip-sync"
  | "vocals" | "remix" | "stems" | "master"
  | "camera-control" | "motion-path" | "depth-control" | "lens-effects";

// App definitions per type
const appsByType: Record<string, { id: AppId; name: string; icon: LucideIcon; description: string; badge?: string }[]> = {
  image: [
    { id: "generate", name: "Generate", icon: ImagePlus, description: "Create images from text", badge: "AI" },
    { id: "upscale", name: "Upscale", icon: Maximize2, description: "Enhance image resolution" },
    { id: "inpainting", name: "Inpainting", icon: Paintbrush, description: "Edit parts of images" },
    { id: "relight", name: "Relight", icon: Sun, description: "Change lighting & mood" },
    { id: "angle", name: "Angle", icon: RotateCcw, description: "Change perspective" },
    { id: "skin-enhancer", name: "Skin Enhancer", icon: Sparkles, description: "Portrait retouching" },
    { id: "background-remove", name: "Remove BG", icon: Scissors, description: "Remove background" },
    { id: "object-erase", name: "Object Erase", icon: Eraser, description: "Remove unwanted objects" },
    { id: "colorize", name: "Colorize", icon: Palette, description: "Add color to B&W" },
    { id: "style-transfer", name: "Style Transfer", icon: Layers, description: "Apply artistic styles" },
  ],
  video: [
    { id: "generate", name: "Generate", icon: Video, description: "Create videos from text", badge: "AI" },
    { id: "extend", name: "Extend", icon: Film, description: "Extend video length" },
    { id: "upscale", name: "Upscale", icon: Maximize2, description: "Enhance video resolution" },
    { id: "interpolate", name: "Interpolate", icon: SlidersHorizontal, description: "Smooth frame rate" },
    { id: "lip-sync", name: "Lip Sync", icon: Mic, description: "Sync audio to video" },
    { id: "style-transfer", name: "Style Transfer", icon: Wand2, description: "Apply video styles" },
  ],
  music: [
    { id: "generate", name: "Generate", icon: Music, description: "Create music from text", badge: "AI" },
    { id: "vocals", name: "Vocals", icon: Mic, description: "Generate vocals" },
    { id: "remix", name: "Remix", icon: SlidersHorizontal, description: "Remix existing tracks" },
    { id: "stems", name: "Stems", icon: Layers, description: "Separate audio stems" },
    { id: "master", name: "Master", icon: Volume2, description: "Audio mastering" },
  ],
  cinema: [
    { id: "generate", name: "Generate", icon: Clapperboard, description: "Cinematic video creation", badge: "AI" },
    { id: "camera-control", name: "Camera Control", icon: Camera, description: "Precise camera movements" },
    { id: "motion-path", name: "Motion Path", icon: Move3d, description: "Custom motion paths" },
    { id: "depth-control", name: "Depth Control", icon: Focus, description: "Control depth of field" },
    { id: "lens-effects", name: "Lens Effects", icon: Aperture, description: "Cinematic lens effects" },
  ],
};

interface AppsSidebarProps {
  currentType: "image" | "video" | "music" | "cinema";
  selectedApp?: AppId;
  onSelectApp?: (appId: AppId) => void;
}

interface AppItemProps {
  icon: LucideIcon;
  name: string;
  description: string;
  badge?: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

const AppItem = ({ icon: Icon, name, description, badge, active, collapsed, onClick }: AppItemProps) => {
  const content = (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all text-left group",
        collapsed && "justify-center px-2",
        active 
          ? "bg-primary/10 text-primary" 
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
      )}
    >
      <div className={cn(
        "flex items-center justify-center h-8 w-8 rounded-lg transition-colors shrink-0",
        active ? "bg-primary/20" : "bg-secondary/50 group-hover:bg-secondary"
      )}>
        <Icon className="h-4 w-4" />
      </div>
      {!collapsed && (
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{name}</span>
            {badge && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
      )}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="flex flex-col gap-0.5">
          <span className="font-medium">{name}</span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
};

const AppsSidebar = ({ currentType, selectedApp = "generate", onSelectApp }: AppsSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const apps = appsByType[currentType] || [];

  const typeLabels: Record<string, string> = {
    image: "Image Apps",
    video: "Video Apps",
    music: "Music Apps",
    cinema: "Cinema Apps",
  };

  return (
    <aside className={cn(
      "hidden md:flex flex-col h-[calc(100vh-4rem)] sticky top-16 border-r border-border/50 bg-sidebar transition-all duration-300",
      collapsed ? "w-[72px]" : "w-60"
    )}>
      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute -right-3 top-6 h-6 w-6 rounded-full border border-border bg-background shadow-sm hover:bg-secondary",
          "z-10"
        )}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>

      {/* Header */}
      {!collapsed && (
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {typeLabels[currentType]}
          </h3>
        </div>
      )}

      {/* Apps List */}
      <nav className={cn("flex-1 overflow-y-auto", collapsed ? "px-2 pt-8" : "px-3 pt-2")}>
        <div className="space-y-1">
          {apps.map((app) => (
            <AppItem
              key={app.id}
              icon={app.icon}
              name={app.name}
              description={app.description}
              badge={app.badge}
              active={selectedApp === app.id}
              collapsed={collapsed}
              onClick={() => onSelectApp?.(app.id)}
            />
          ))}
        </div>
      </nav>

      {/* Footer hint */}
      {!collapsed && (
        <div className="p-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            More apps coming soon
          </p>
        </div>
      )}
    </aside>
  );
};

export default AppsSidebar;
