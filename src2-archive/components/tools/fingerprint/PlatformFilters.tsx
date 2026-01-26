import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PLATFORMS = [
  { id: "linkedin", label: "LinkedIn", icon: "💼" },
  { id: "instagram", label: "Instagram", icon: "📷" },
  { id: "twitter", label: "X/Twitter", icon: "🐦" },
  { id: "facebook", label: "Facebook", icon: "👤" },
  { id: "tiktok", label: "TikTok", icon: "🎵" },
  { id: "youtube", label: "YouTube", icon: "▶️" },
];

interface PlatformFiltersProps {
  selectedPlatforms: string[];
  onChange: (platforms: string[]) => void;
}

export const PlatformFilters = ({ selectedPlatforms, onChange }: PlatformFiltersProps) => {
  const togglePlatform = (platformId: string) => {
    if (selectedPlatforms.includes(platformId)) {
      onChange(selectedPlatforms.filter(p => p !== platformId));
    } else {
      onChange([...selectedPlatforms, platformId]);
    }
  };

  const toggleAll = () => {
    if (selectedPlatforms.length === PLATFORMS.length) {
      onChange([]);
    } else {
      onChange(PLATFORMS.map(p => p.id));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Platforms to search</label>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={toggleAll}
        >
          {selectedPlatforms.length === PLATFORMS.length ? "Deselect all" : "Select all"}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((platform) => {
          const isSelected = selectedPlatforms.includes(platform.id);
          return (
            <Badge
              key={platform.id}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-all hover:scale-105",
                isSelected && "bg-primary"
              )}
              onClick={() => togglePlatform(platform.id)}
            >
              <span className="mr-1">{platform.icon}</span>
              {platform.label}
            </Badge>
          );
        })}
      </div>
    </div>
  );
};

export const PLATFORM_IDS = PLATFORMS.map(p => p.id);
