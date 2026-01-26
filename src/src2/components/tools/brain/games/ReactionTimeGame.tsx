import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Zap, Play, RotateCcw } from "lucide-react";
import { GameProps, GameResult } from "./types";

type GameState = 'idle' | 'waiting' | 'ready' | 'clicked' | 'too_early' | 'finished';

const ReactionTimeGame = ({ onComplete, onClose }: GameProps) => {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [lastReaction, setLastReaction] = useState<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const totalRounds = 5;

  const startRound = useCallback(() => {
    setGameState('waiting');
    setLastReaction(null);
    
    // Random delay between 1-4 seconds
    const delay = 1000 + Math.random() * 3000;
    timeoutRef.current = setTimeout(() => {
      setGameState('ready');
      setStartTime(Date.now());
    }, delay);
  }, []);

  const handleClick = () => {
    if (gameState === 'idle') {
      startRound();
      return;
    }
    
    if (gameState === 'waiting') {
      // Clicked too early
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setGameState('too_early');
      return;
    }
    
    if (gameState === 'ready') {
      const reactionTime = Date.now() - startTime;
      setLastReaction(reactionTime);
      setReactionTimes(prev => [...prev, reactionTime]);
      setGameState('clicked');
      
      if (currentRound + 1 >= totalRounds) {
        setGameState('finished');
      }
    }
  };

  const continueGame = () => {
    setCurrentRound(prev => prev + 1);
    startRound();
  };

  const retryAfterEarly = () => {
    startRound();
  };

  const finishGame = () => {
    const avgTime = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length;
    const bestTime = Math.min(...reactionTimes);
    
    // Score based on reaction time (lower is better)
    // 200ms = 100 points, 400ms = 50 points, 600ms+ = 0 points
    const score = Math.max(0, Math.round(100 - ((avgTime - 200) / 4)));
    
    const result: GameResult = {
      game_type: 'reaction_time',
      score,
      avg_reaction_time_ms: Math.round(avgTime),
      best_reaction_time_ms: bestTime,
      correct_responses: reactionTimes.length,
      duration_seconds: Math.round(reactionTimes.reduce((a, b) => a + b, 0) / 1000),
    };
    
    onComplete(result);
  };

  const resetGame = () => {
    setGameState('idle');
    setReactionTimes([]);
    setCurrentRound(0);
    setLastReaction(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const getBackgroundColor = () => {
    switch (gameState) {
      case 'waiting': return 'bg-rose-500/20';
      case 'ready': return 'bg-emerald-500/20';
      case 'too_early': return 'bg-amber-500/20';
      case 'clicked': return 'bg-blue-500/20';
      default: return 'bg-secondary/30';
    }
  };

  const getMessage = () => {
    switch (gameState) {
      case 'idle': return 'Click to Start';
      case 'waiting': return 'Wait for Green...';
      case 'ready': return 'Click NOW!';
      case 'too_early': return 'Too Early!';
      case 'clicked': return `${lastReaction}ms`;
      case 'finished': return 'Complete!';
      default: return '';
    }
  };

  return (
    <Card className="border-0 max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-400" />
          Reaction Time Test
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground text-center">
          Round {Math.min(currentRound + 1, totalRounds)} of {totalRounds}
        </div>
        
        {/* Game Area */}
        <div
          className={`h-48 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 ${getBackgroundColor()}`}
          onClick={handleClick}
        >
          <span className="text-2xl font-bold">
            {getMessage()}
          </span>
        </div>

        {/* Results */}
        {reactionTimes.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            {reactionTimes.map((time, i) => (
              <span key={i} className="px-2 py-1 bg-secondary/50 rounded text-sm">
                {time}ms
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-center">
          {gameState === 'too_early' && (
            <Button onClick={retryAfterEarly} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
          )}
          
          {gameState === 'clicked' && currentRound + 1 < totalRounds && (
            <Button onClick={continueGame} className="gap-2">
              <Play className="h-4 w-4" />
              Next Round
            </Button>
          )}
          
          {gameState === 'finished' && (
            <>
              <Button variant="outline" onClick={resetGame} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Play Again
              </Button>
              <Button onClick={finishGame} className="gap-2">
                Save Results
              </Button>
            </>
          )}
        </div>

        {gameState === 'finished' && reactionTimes.length > 0 && (
          <div className="text-center space-y-1 pt-2">
            <div className="text-lg font-semibold">
              Average: {Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)}ms
            </div>
            <div className="text-sm text-muted-foreground">
              Best: {Math.min(...reactionTimes)}ms
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReactionTimeGame;
