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
    <div className="overflow-x-auto">
      <div className="flex gap-3 px-4 py-2" style={{ width: "max-content" }}>
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
                  "w-13 h-13 rounded-xl flex items-center justify-center relative transition-all",
                  isSelected
                    ? "bg-primary shadow-lg shadow-primary/30"
                    : "bg-secondary border border-border"
                )}
                style={{ width: 52, height: 52 }}
              >
                <Icon
                  className={cn(
                    "w-6 h-6",
                    isSelected ? "text-primary-foreground" : "text-muted-foreground"
                  )}
                />
                {tool.badge && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-green-500 text-[8px] font-bold text-white rounded">
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
