import { cn } from "@/lib/utils";
import { Lightbulb, AlertTriangle, CheckCircle } from "lucide-react";
import { BrainInsight } from "./types";

interface BrainInsightCardProps {
  insight: BrainInsight;
}

const BrainInsightCard = ({ insight }: BrainInsightCardProps) => {
  const getIcon = () => {
    switch (insight.type) {
      case 'positive':
        return <CheckCircle className="h-5 w-5 text-emerald-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-400" />;
      default:
        return <Lightbulb className="h-5 w-5 text-blue-400" />;
    }
  };

  return (
    <div className={cn(
      "p-4 rounded-xl border",
      insight.type === 'positive' && "border-emerald-500/30 bg-emerald-500/10",
      insight.type === 'warning' && "border-amber-500/30 bg-amber-500/10",
      insight.type === 'neutral' && "border-blue-500/30 bg-blue-500/10"
    )}>
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="space-y-1">
          <h4 className="font-medium text-sm">{insight.title}</h4>
          <p className="text-sm text-muted-foreground">
            {insight.description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BrainInsightCard;
