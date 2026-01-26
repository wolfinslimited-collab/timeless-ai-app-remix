import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface GameCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  onClick: () => void;
  bestScore?: number;
  lastPlayed?: string;
}

const GameCard = ({ 
  title, 
  description, 
  icon: Icon, 
  color, 
  onClick,
  bestScore,
  lastPlayed,
}: GameCardProps) => {
  return (
    <Card 
      className="border-0 cursor-pointer hover:bg-secondary/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
            {(bestScore !== undefined || lastPlayed) && (
              <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                {bestScore !== undefined && (
                  <span>Best: {bestScore}</span>
                )}
                {lastPlayed && (
                  <span>Last: {lastPlayed}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GameCard;
