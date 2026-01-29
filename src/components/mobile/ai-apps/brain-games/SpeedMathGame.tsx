import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, RotateCcw, Trophy, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpeedMathGameProps {
  onBack: () => void;
  onComplete?: (score: number) => void;
}

interface Problem {
  question: string;
  answer: number;
  options: number[];
}

const GAME_DURATION = 60; // seconds
const PROBLEMS_COUNT = 10;

export function SpeedMathGame({ onBack, onComplete }: SpeedMathGameProps) {
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [problemIndex, setProblemIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isComplete, setIsComplete] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [gameStarted, setGameStarted] = useState(false);

  const generateProblem = useCallback((): Problem => {
    const operations = ["+", "-", "×"];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let num1: number, num2: number, answer: number;

    switch (operation) {
      case "+":
        num1 = Math.floor(Math.random() * 50) + 1;
        num2 = Math.floor(Math.random() * 50) + 1;
        answer = num1 + num2;
        break;
      case "-":
        num1 = Math.floor(Math.random() * 50) + 20;
        num2 = Math.floor(Math.random() * num1) + 1;
        answer = num1 - num2;
        break;
      case "×":
        num1 = Math.floor(Math.random() * 12) + 1;
        num2 = Math.floor(Math.random() * 12) + 1;
        answer = num1 * num2;
        break;
      default:
        num1 = 1;
        num2 = 1;
        answer = 2;
    }

    // Generate wrong options
    const wrongOptions = new Set<number>();
    while (wrongOptions.size < 3) {
      const offset = Math.floor(Math.random() * 10) - 5;
      const wrongAnswer = answer + offset;
      if (wrongAnswer !== answer && wrongAnswer > 0) {
        wrongOptions.add(wrongAnswer);
      }
    }

    const options = [...wrongOptions, answer].sort(() => Math.random() - 0.5);

    return {
      question: `${num1} ${operation} ${num2}`,
      answer,
      options,
    };
  }, []);

  const startGame = useCallback(() => {
    setGameStarted(true);
    setProblemIndex(0);
    setScore(0);
    setStreak(0);
    setTimeLeft(GAME_DURATION);
    setIsComplete(false);
    setCurrentProblem(generateProblem());
  }, [generateProblem]);

  useEffect(() => {
    if (gameStarted && timeLeft > 0 && !isComplete) {
      const timer = setInterval(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && gameStarted) {
      setIsComplete(true);
      onComplete?.(score);
    }
  }, [timeLeft, gameStarted, isComplete, score, onComplete]);

  const handleAnswer = (selectedAnswer: number) => {
    if (!currentProblem || feedback) return;

    const isCorrect = selectedAnswer === currentProblem.answer;
    
    if (isCorrect) {
      const points = 10 + streak * 2;
      setScore((s) => s + points);
      setStreak((s) => s + 1);
      setFeedback("correct");
    } else {
      setStreak(0);
      setFeedback("wrong");
    }

    setTimeout(() => {
      setFeedback(null);
      if (problemIndex < PROBLEMS_COUNT - 1) {
        setProblemIndex((i) => i + 1);
        setCurrentProblem(generateProblem());
      } else {
        setIsComplete(true);
        onComplete?.(score);
      }
    }, 500);
  };

  if (!gameStarted) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="px-4 py-3 border-b border-border flex items-center gap-3">
          <button onClick={onBack} className="p-1">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">Speed Math</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
            <Clock className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-3">Ready to Test Your Speed?</h2>
          <p className="text-sm text-muted-foreground mb-2">
            Solve as many math problems as you can in {GAME_DURATION} seconds!
          </p>
          <p className="text-xs text-muted-foreground mb-8">
            Build streaks for bonus points
          </p>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
          >
            Start Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">Speed Math</h1>
        </div>
        <button
          onClick={startGame}
          className="p-2 rounded-lg bg-secondary text-muted-foreground"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 flex justify-around bg-secondary/50">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{score}</p>
          <p className="text-xs text-muted-foreground">Score</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{streak}🔥</p>
          <p className="text-xs text-muted-foreground">Streak</p>
        </div>
        <div className="text-center">
          <p className={cn(
            "text-2xl font-bold",
            timeLeft <= 10 ? "text-destructive" : "text-foreground"
          )}>
            {timeLeft}s
          </p>
          <p className="text-xs text-muted-foreground">Time</p>
        </div>
      </div>

      {/* Problem */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className={cn(
          "w-full max-w-xs p-8 rounded-2xl border text-center transition-colors",
          feedback === "correct" ? "bg-green-500/10 border-green-500/50" :
          feedback === "wrong" ? "bg-destructive/10 border-destructive/50" :
          "bg-secondary border-border"
        )}>
          <p className="text-4xl font-bold text-foreground mb-2">
            {currentProblem?.question}
          </p>
          <p className="text-muted-foreground">= ?</p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3 mt-8 w-full max-w-xs">
          {currentProblem?.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(option)}
              disabled={!!feedback}
              className={cn(
                "py-4 rounded-xl text-xl font-bold transition-all",
                feedback && option === currentProblem.answer
                  ? "bg-green-500/20 text-green-500 border-2 border-green-500"
                  : "bg-card border border-border text-foreground hover:bg-secondary"
              )}
            >
              {option}
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
            <h2 className="text-xl font-bold text-foreground mb-2">Time's Up!</h2>
            <p className="text-3xl font-bold text-primary mb-2">{score} points</p>
            <p className="text-muted-foreground mb-4">
              Great job! Keep practicing to improve your score.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onBack}
                className="flex-1 py-2 rounded-xl bg-secondary text-foreground font-medium"
              >
                Exit
              </button>
              <button
                onClick={startGame}
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
