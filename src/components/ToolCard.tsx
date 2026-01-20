import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ToolCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: "new" | "top" | "pro" | "unlimited";
  gradient?: string;
  onClick?: () => void;
}

const badgeConfig = {
  new: { label: "NEW", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  top: { label: "TOP", className: "gradient-primary text-primary-foreground border-0" },
  pro: { label: "PRO", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  unlimited: { label: "∞", className: "bg-primary/20 text-primary border-primary/30" },
};

const ToolCard = ({ title, description, icon, badge, gradient, onClick }: ToolCardProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-start gap-3 p-5 rounded-2xl border border-border/50",
        "bg-card hover:bg-secondary/50 transition-all duration-300",
        "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
        "text-left w-full"
      )}
    >
      {/* Badge */}
      {badge && (
        <Badge 
          variant="outline" 
          className={cn("absolute top-4 right-4 text-[10px] font-bold", badgeConfig[badge].className)}
        >
          {badgeConfig[badge].label}
        </Badge>
      )}

      {/* Icon */}
      <div className={cn(
        "flex h-12 w-12 items-center justify-center rounded-xl",
        gradient || "bg-secondary"
      )}>
        {icon}
      </div>

      {/* Content */}
      <div className="space-y-1">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>
      </div>
    </button>
  );
};

export default ToolCard;
