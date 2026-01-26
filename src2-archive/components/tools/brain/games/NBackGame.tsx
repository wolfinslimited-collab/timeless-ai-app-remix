import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { X, Brain, Play, RotateCcw } from "lucide-react";
import { GameProps, GameResult } from "./types";

type GamePhase = 'intro' | 'playing' | 'feedback' | 'finished';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'K', 'L'];
const TOTAL_TRIALS = 20;
const N_BACK = 2; // 2-back test
const MATCH_PROBABILITY = 0.3;
const DISPLAY_TIME = 2000; // ms
const INTER_TRIAL_TIME = 500; // ms

const NBackGame = ({ onComplete, onClose }: GameProps) => {
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [currentLetter, setCurrentLetter] = useState<string | null>(null);
  const [sequence, setSequence] = useState<string[]>([]);
  const [trialIndex, setTrialIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [responded, setResponded] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const generateSequence = useCallback(() => {
    const seq: string[] = [];
    for (let i = 0; i < TOTAL_TRIALS; i++) {
      if (i >= N_BACK && Math.random() < MATCH_PROBABILITY) {
        // Create a match
        seq.push(seq[i - N_BACK]);
      } else {
        // Random letter (avoiding unintended matches when possible)
        let letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
        if (i >= N_BACK) {
          // Try to avoid accidental matches
          let attempts = 0;
          while (letter === seq[i - N_BACK] && attempts < 5) {
            letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
            attempts++;
          }
        }
        seq.push(letter);
      }
    }
    return seq;
  }, []);

  const startGame = () => {
    const seq = generateSequence();
    setSequence(seq);
    setTrialIndex(0);
    setCorrect(0);
    setIncorrect(0);
    setStartTime(Date.now());
    setPhase('playing');
    showTrial(0, seq);
  };

  const showTrial = useCallback((index: number, seq: string[]) => {
    if (index >= seq.length) {
      setPhase('finished');
      return;
    }
    
    setCurrentLetter(seq[index]);
    setResponded(false);
    setLastFeedback(null);
    
    timeoutRef.current = setTimeout(() => {
      // If no response, check if it was a miss
      if (!responded) {
        const isMatch = index >= N_BACK && seq[index] === seq[index - N_BACK];
        if (isMatch) {
          setIncorrect(prev => prev + 1);
          setLastFeedback('incorrect');
        }
      }
      
      setCurrentLetter(null);
      setPhase('feedback');
      
      setTimeout(() => {
        setTrialIndex(prev => prev + 1);
        showTrial(index + 1, seq);
      }, INTER_TRIAL_TIME);
    }, DISPLAY_TIME);
  }, [responded]);

  const handleResponse = (isMatchResponse: boolean) => {
    if (responded || trialIndex < N_BACK) return;
    
    setResponded(true);
    const isActualMatch = sequence[trialIndex] === sequence[trialIndex - N_BACK];
    
    if (isMatchResponse === isActualMatch) {
      setCorrect(prev => prev + 1);
      setLastFeedback('correct');
    } else {
      setIncorrect(prev => prev + 1);
      setLastFeedback('incorrect');
    }
  };

  const finishGame = () => {
    const duration = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
    const totalResponses = correct + incorrect;
    const accuracy = totalResponses > 0 ? Math.round((correct / totalResponses) * 100) : 0;
    
    // Score based on accuracy
    const score = accuracy;
    
    const result: GameResult = {
      game_type: 'n_back',
      score,
      accuracy,
      level_reached: N_BACK,
      correct_responses: correct,
      incorrect_responses: incorrect,
      duration_seconds: duration,
      metadata: { n_level: N_BACK, total_trials: TOTAL_TRIALS },
    };
    
    onComplete(result);
  };

  const resetGame = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPhase('intro');
    setCurrentLetter(null);
    setSequence([]);
    setTrialIndex(0);
    setCorrect(0);
    setIncorrect(0);
    setResponded(false);
    setLastFeedback(null);
    setStartTime(null);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const progress = (trialIndex / TOTAL_TRIALS) * 100;

  return (
    <Card className="border-0 max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Brain className="h-5 w-5 text-cyan-400" />
          N-Back ({N_BACK}-Back)
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {phase === 'intro' && (
          <div className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Press <strong>Match</strong> when the current letter is the same 
              as the one shown <strong>{N_BACK} letters ago</strong>.
            </p>
            <div className="p-4 bg-secondary/30 rounded-xl">
              <p className="text-sm">Example: A → B → <span className="text-primary font-bold">A</span> (Match!)</p>
            </div>
            <Button onClick={startGame} className="gap-2">
              <Play className="h-4 w-4" />
              Start Game
            </Button>
          </div>
        )}

        {(phase === 'playing' || phase === 'feedback') && (
          <>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Trial {trialIndex + 1}/{TOTAL_TRIALS}</span>
              <span>Correct: {correct}</span>
            </div>
            
            {/* Letter Display */}
            <div 
              className={`
                h-32 rounded-xl flex items-center justify-center text-6xl font-bold
                transition-all duration-200
                ${lastFeedback === 'correct' ? 'bg-emerald-500/20' : ''}
                ${lastFeedback === 'incorrect' ? 'bg-rose-500/20' : ''}
                ${!lastFeedback ? 'bg-secondary/30' : ''}
              `}
            >
              {currentLetter || (lastFeedback ? (lastFeedback === 'correct' ? '✓' : '✗') : '')}
            </div>

            {/* Response Buttons */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => handleResponse(false)}
                disabled={responded || trialIndex < N_BACK}
              >
                No Match
              </Button>
              <Button 
                className="flex-1"
                onClick={() => handleResponse(true)}
                disabled={responded || trialIndex < N_BACK}
              >
                Match!
              </Button>
            </div>
            
            {trialIndex < N_BACK && (
              <p className="text-center text-sm text-muted-foreground">
                Watch the letters... (wait for {N_BACK} letters)
              </p>
            )}
          </>
        )}

        {phase === 'finished' && (
          <div className="text-center space-y-4">
            <div className="text-4xl font-bold">
              {Math.round((correct / (correct + incorrect || 1)) * 100)}%
            </div>
            <div className="text-muted-foreground">
              {correct} correct · {incorrect} incorrect
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={resetGame} className="gap-2">
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

export default NBackGame;
