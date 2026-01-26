import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface BrainScoreCardProps {
  title: string;
  score: number | null;
  maxScore?: number;
  icon: LucideIcon;
  color: string;
  description?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  size?: 'sm' | 'lg';
}

const BrainScoreCard = ({
  title,
  score,
  maxScore = 100,
  icon: Icon,
  color,
  description,
  trend,
  trendValue,
  size = 'sm',
}: BrainScoreCardProps) => {
  const percentage = score !== null ? (score / maxScore) * 100 : 0;
  
  const getScoreLabel = (score: number | null) => {
    if (score === null) return 'No data';
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Average';
    if (score >= 20) return 'Low';
    return 'Very Low';
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '→';
  };

  return (
    <div className={cn(
      "rounded-2xl border border-border/50 bg-card p-4",
      size === 'lg' && "p-6"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          "rounded-xl flex items-center justify-center",
          color,
          size === 'lg' ? "w-12 h-12" : "w-10 h-10"
        )}>
          <Icon className={cn(
            "text-foreground",
            size === 'lg' ? "h-6 w-6" : "h-5 w-5"
          )} />
        </div>
        
        {trend && trendValue !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-sm",
            trend === 'up' && "text-emerald-400",
            trend === 'down' && "text-rose-400",
            trend === 'stable' && "text-muted-foreground"
          )}>
            <span>{getTrendIcon()}</span>
            <span>{Math.abs(trendValue)}%</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className={cn(
            "font-bold",
            size === 'lg' ? "text-3xl" : "text-2xl"
          )}>
            {score !== null ? score : '--'}
          </span>
          <span className="text-muted-foreground text-sm">/ {maxScore}</span>
        </div>
        
        <h3 className={cn(
          "font-medium",
          size === 'lg' ? "text-base" : "text-sm"
        )}>
          {title}
        </h3>

        {/* Progress bar */}
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-500",
              score !== null && score >= 60 ? "bg-emerald-500" : 
              score !== null && score >= 40 ? "bg-amber-500" : "bg-rose-500"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {description && (
          <p className="text-xs text-muted-foreground mt-2">
            {description}
          </p>
        )}

        <p className={cn(
          "text-xs",
          score !== null && score >= 60 ? "text-emerald-400" : 
          score !== null && score >= 40 ? "text-amber-400" : "text-rose-400"
        )}>
          {getScoreLabel(score)}
        </p>
      </div>
    </div>
  );
};

export default BrainScoreCard;
