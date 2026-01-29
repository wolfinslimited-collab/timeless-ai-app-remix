import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, RotateCcw, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface MemoryMatchGameProps {
  onBack: () => void;
  onComplete?: (score: number) => void;
}

interface Card {
  id: number;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const SYMBOLS = ["🎯", "⭐", "💎", "🔥", "🌙", "⚡", "🎨", "🎵"];

export function MemoryMatchGame({ onBack, onComplete }: MemoryMatchGameProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const initializeGame = useCallback(() => {
    const shuffledSymbols = [...SYMBOLS, ...SYMBOLS]
      .sort(() => Math.random() - 0.5)
      .map((symbol, index) => ({
        id: index,
        symbol,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(shuffledSymbols);
    setFlippedCards([]);
    setMoves(0);
    setMatches(0);
    setIsComplete(false);
    setStartTime(Date.now());
    setElapsedTime(0);
  }, []);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  useEffect(() => {
    if (startTime && !isComplete) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [startTime, isComplete]);

  useEffect(() => {
    if (matches === SYMBOLS.length && matches > 0) {
      setIsComplete(true);
      const score = Math.max(100 - (moves - SYMBOLS.length) * 5, 10);
      onComplete?.(score);
    }
  }, [matches, moves, onComplete]);

  const handleCardClick = (cardId: number) => {
    if (flippedCards.length === 2) return;
    
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, isFlipped: true } : c))
    );

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [first, second] = newFlipped;
      const firstCard = cards.find((c) => c.id === first);
      const secondCard = cards.find((c) => c.id === second);

      if (firstCard?.symbol === secondCard?.symbol) {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === first || c.id === second ? { ...c, isMatched: true } : c
            )
          );
          setMatches((m) => m + 1);
          setFlippedCards([]);
        }, 500);
      } else {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === first || c.id === second ? { ...c, isFlipped: false } : c
            )
          );
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">Memory Match</h1>
        </div>
        <button
          onClick={initializeGame}
          className="p-2 rounded-lg bg-secondary text-muted-foreground"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 flex justify-around bg-secondary/50">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{moves}</p>
          <p className="text-xs text-muted-foreground">Moves</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{matches}/{SYMBOLS.length}</p>
          <p className="text-xs text-muted-foreground">Matches</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{formatTime(elapsedTime)}</p>
          <p className="text-xs text-muted-foreground">Time</p>
        </div>
      </div>

      {/* Game Grid */}
      <div className="flex-1 p-4 flex items-center justify-center">
        <div className="grid grid-cols-4 gap-2 w-full max-w-xs">
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              disabled={card.isMatched || flippedCards.length === 2}
              className={cn(
                "aspect-square rounded-xl text-2xl font-bold transition-all duration-300 transform",
                card.isFlipped || card.isMatched
                  ? "bg-secondary border-2 border-primary/50 scale-100"
                  : "bg-card border border-border hover:scale-105",
                card.isMatched && "opacity-50"
              )}
            >
              {(card.isFlipped || card.isMatched) ? card.symbol : "?"}
            </button>
          ))}
        </div>
      </div>

      {/* Completion Modal */}
      {isComplete && (
        <div className="absolute inset-0 bg-background/90 flex items-center justify-center p-6">
          <div className="bg-card border border-border rounded-2xl p-6 text-center max-w-xs w-full">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Congratulations!</h2>
            <p className="text-muted-foreground mb-4">
              You completed the game in {moves} moves and {formatTime(elapsedTime)}!
            </p>
            <div className="flex gap-3">
              <button
                onClick={onBack}
                className="flex-1 py-2 rounded-xl bg-secondary text-foreground font-medium"
              >
                Exit
              </button>
              <button
                onClick={initializeGame}
                className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-medium"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
