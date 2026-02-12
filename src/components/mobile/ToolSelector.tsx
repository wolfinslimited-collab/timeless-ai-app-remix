import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToolItem {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  credits: number;
  isGenerate?: boolean;
  badge?: string;
}

interface ToolSelectorProps {
  tools: ToolItem[];
  selectedToolId: string;
  onToolSelected: (tool: ToolItem) => void;
}

export function ToolSelector({ tools, selectedToolId, onToolSelected }: ToolSelectorProps) {
  return (
    <div className="overflow-x-auto min-h-[120px]">
      <div className="flex gap-3 px-4 py-3" style={{ width: "max-content" }}>
        {tools.map((tool) => {
          const isSelected = tool.id === selectedToolId;
          const Icon = tool.icon;

          return (
            <button
              key={tool.id}
              onClick={() => onToolSelected(tool)}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className={cn(
                  "w-13 h-13 rounded-2xl flex items-center justify-center relative transition-all",
                  isSelected
                    ? "bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/40"
                    : "bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/5"
                )}
                style={{ width: 56, height: 56 }}
              >
                {/* Glass highlight effect */}
                {!isSelected && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                )}
                <Icon
                  className={cn(
                    "w-6 h-6 relative z-10",
                    isSelected ? "text-primary-foreground" : "text-foreground/70"
                  )}
                />
                {tool.badge && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-gradient-to-r from-green-500 to-emerald-500 text-[8px] font-bold text-white rounded-md shadow-lg shadow-green-500/30">
                    {tool.badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium w-14 text-center truncate",
                  isSelected ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {tool.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
