import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Grid3X3, RotateCcw, Trophy } from "lucide-react";
import { GameProps, GameResult } from "./types";

const EMOJIS = ['🧠', '⚡', '🎯', '💡', '🔮', '🌟', '🎨', '🎪'];

interface CardState {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const MemoryPairsGame = ({ onComplete, onClose }: GameProps) => {
  const [cards, setCards] = useState<CardState[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const initializeGame = useCallback(() => {
    const shuffled = [...EMOJIS, ...EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(shuffled);
    setFlippedCards([]);
    setMoves(0);
    setMatches(0);
    setStartTime(null);
    setIsLocked(false);
    setIsComplete(false);
  }, []);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const handleCardClick = (cardId: number) => {
    if (isLocked) return;
    if (flippedCards.length >= 2) return;
    
    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;
    
    // Start timer on first flip
    if (!startTime) {
      setStartTime(Date.now());
    }

    // Flip the card
    setCards(prev => prev.map(c => 
      c.id === cardId ? { ...c, isFlipped: true } : c
    ));
    
    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);
    
    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      setIsLocked(true);
      
      const [firstId, secondId] = newFlipped;
      const firstCard = cards.find(c => c.id === firstId);
      const secondCard = cards.find(c => c.id === secondId);
      
      if (firstCard && secondCard && firstCard.emoji === secondCard.emoji) {
        // Match found
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            c.id === firstId || c.id === secondId 
              ? { ...c, isMatched: true } 
              : c
          ));
          setMatches(prev => {
            const newMatches = prev + 1;
            if (newMatches === EMOJIS.length) {
              setIsComplete(true);
            }
            return newMatches;
          });
          setFlippedCards([]);
          setIsLocked(false);
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            c.id === firstId || c.id === secondId 
              ? { ...c, isFlipped: false } 
              : c
          ));
          setFlippedCards([]);
          setIsLocked(false);
        }, 1000);
      }
    }
  };

  const finishGame = () => {
    const duration = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
    
    // Score based on moves (fewer is better)
    // Perfect game (8 moves) = 100 points
    // Each extra move reduces score
    const perfectMoves = EMOJIS.length;
    const score = Math.max(0, Math.round(100 - ((moves - perfectMoves) * 5)));
    const accuracy = Math.round((EMOJIS.length / moves) * 100);
    
    const result: GameResult = {
      game_type: 'memory_pairs',
      score,
      accuracy,
      moves_made: moves,
      correct_responses: EMOJIS.length,
      duration_seconds: duration,
    };
    
    onComplete(result);
  };

  return (
    <Card className="border-0 max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-violet-400" />
          Memory Pairs
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Moves: {moves}</span>
          <span>Matches: {matches}/{EMOJIS.length}</span>
        </div>
        
        {/* Game Grid */}
        <div className="grid grid-cols-4 gap-2">
          {cards.map(card => (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              disabled={card.isMatched || isLocked}
              className={`
                aspect-square rounded-lg text-2xl flex items-center justify-center
                transition-all duration-300 transform
                ${card.isFlipped || card.isMatched 
                  ? 'bg-primary/20 rotate-0' 
                  : 'bg-secondary hover:bg-secondary/80 rotate-y-180'
                }
                ${card.isMatched ? 'opacity-50' : ''}
              `}
            >
              {(card.isFlipped || card.isMatched) ? card.emoji : '?'}
            </button>
          ))}
        </div>

        {/* Complete State */}
        {isComplete && (
          <div className="text-center space-y-4 pt-4">
            <div className="flex items-center justify-center gap-2">
              <Trophy className="h-6 w-6 text-amber-400" />
              <span className="text-xl font-bold">Complete!</span>
            </div>
            <div className="text-muted-foreground">
              Completed in {moves} moves
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={initializeGame} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Play Again
              </Button>
              <Button onClick={finishGame}>
                Save Results
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MemoryPairsGame;
