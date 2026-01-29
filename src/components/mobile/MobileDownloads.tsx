import { ArrowLeft, Download, Image as ImageIcon, Video, Music, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileDownloadsProps {
  onBack: () => void;
}

// Mock downloads data - in real app this would come from local storage or state
const mockDownloads: { id: string; type: "image" | "video" | "audio"; name: string; date: string; size: string }[] = [];

export function MobileDownloads({ onBack }: MobileDownloadsProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "image":
        return ImageIcon;
      case "video":
        return Video;
      case "audio":
        return Music;
      default:
        return Download;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-2">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>
        
        <h1 className="text-foreground text-2xl font-bold">Downloads</h1>
        <p className="text-muted-foreground text-sm">Your downloaded creations</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {mockDownloads.length > 0 ? (
          <div className="space-y-3 mt-4">
            {mockDownloads.map(item => {
              const Icon = getIcon(item.type);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border"
                >
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                    <Icon className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-foreground text-sm font-medium truncate">{item.name}</h3>
                    <p className="text-muted-foreground text-xs">{item.date} • {item.size}</p>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Download className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-foreground text-lg font-semibold mb-2">No Downloads Yet</h2>
            <p className="text-muted-foreground text-sm">
              Downloaded creations will appear here. Save your favorite generations to access them offline.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
