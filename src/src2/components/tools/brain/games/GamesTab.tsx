import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Zap, Grid3X3, Brain, Trophy, Gamepad2 } from "lucide-react";
import { format } from "date-fns";
import GameCard from "./GameCard";
import ReactionTimeGame from "./ReactionTimeGame";
import MemoryPairsGame from "./MemoryPairsGame";
import NBackGame from "./NBackGame";
import { GameResult, GameSession } from "./types";

type ActiveGame = 'reaction_time' | 'memory_pairs' | 'n_back' | null;

interface GameStats {
  reaction_time?: { bestScore: number; lastPlayed: string };
  memory_pairs?: { bestScore: number; lastPlayed: string };
  n_back?: { bestScore: number; lastPlayed: string };
}

const GamesTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeGame, setActiveGame] = useState<ActiveGame>(null);
  const [gameStats, setGameStats] = useState<GameStats>({});
  const [recentSessions, setRecentSessions] = useState<GameSession[]>([]);

  useEffect(() => {
    if (user) {
      loadGameStats();
    }
  }, [user]);

  const loadGameStats = async () => {
    if (!user) return;

    // Load best scores and recent sessions for each game type
    const gameTypes = ['reaction_time', 'memory_pairs', 'n_back'] as const;
    const stats: GameStats = {};

    for (const gameType of gameTypes) {
      const { data } = await supabase
        .from("brain_game_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("game_type", gameType)
        .order("score", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        stats[gameType] = {
          bestScore: data[0].score,
          lastPlayed: format(new Date(data[0].created_at), 'MMM d'),
        };
      }
    }

    setGameStats(stats);

    // Load recent sessions
    const { data: recent } = await supabase
      .from("brain_game_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (recent) {
      setRecentSessions(recent as GameSession[]);
    }
  };

  const handleGameComplete = async (result: GameResult) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("brain_game_sessions")
        .insert([{
          user_id: user.id,
          game_type: result.game_type,
          score: result.score,
          accuracy: result.accuracy,
          avg_reaction_time_ms: result.avg_reaction_time_ms,
          best_reaction_time_ms: result.best_reaction_time_ms,
          level_reached: result.level_reached,
          moves_made: result.moves_made,
          correct_responses: result.correct_responses,
          incorrect_responses: result.incorrect_responses,
          duration_seconds: result.duration_seconds,
          metadata: (result.metadata ? JSON.parse(JSON.stringify(result.metadata)) : {}) as Json,
        }]);

      if (error) throw error;

      // Update brain_metrics with reaction speed if it's a reaction time game
      if (result.game_type === 'reaction_time' && result.avg_reaction_time_ms) {
        const today = format(new Date(), 'yyyy-MM-dd');
        await supabase
          .from("brain_metrics")
          .upsert({
            user_id: user.id,
            metric_date: today,
            reaction_speed: Math.max(0, Math.round(100 - ((result.avg_reaction_time_ms - 200) / 4))),
          }, { onConflict: 'user_id,metric_date' });
      }

      toast({
        title: "Game Saved!",
        description: `Score: ${result.score} points`,
      });

      setActiveGame(null);
      loadGameStats();
    } catch (error) {
      console.error("Error saving game result:", error);
      toast({
        title: "Error",
        description: "Failed to save game result.",
        variant: "destructive",
      });
    }
  };

  const getGameName = (type: string) => {
    switch (type) {
      case 'reaction_time': return 'Reaction Time';
      case 'memory_pairs': return 'Memory Pairs';
      case 'n_back': return 'N-Back';
      default: return type;
    }
  };

  if (activeGame === 'reaction_time') {
    return <ReactionTimeGame onComplete={handleGameComplete} onClose={() => setActiveGame(null)} />;
  }

  if (activeGame === 'memory_pairs') {
    return <MemoryPairsGame onComplete={handleGameComplete} onClose={() => setActiveGame(null)} />;
  }

  if (activeGame === 'n_back') {
    return <NBackGame onComplete={handleGameComplete} onClose={() => setActiveGame(null)} />;
  }

  return (
    <div className="space-y-6">
      {/* Games List */}
      <Card className="border-0">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-violet-400" />
            Brain Training Games
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <GameCard
            title="Reaction Time"
            description="Test your reflexes. Click as fast as you can when you see the signal."
            icon={Zap}
            color="bg-amber-500/20"
            onClick={() => setActiveGame('reaction_time')}
            bestScore={gameStats.reaction_time?.bestScore}
            lastPlayed={gameStats.reaction_time?.lastPlayed}
          />
          <GameCard
            title="Memory Pairs"
            description="Match pairs of cards. Train your visual memory and recall."
            icon={Grid3X3}
            color="bg-violet-500/20"
            onClick={() => setActiveGame('memory_pairs')}
            bestScore={gameStats.memory_pairs?.bestScore}
            lastPlayed={gameStats.memory_pairs?.lastPlayed}
          />
          <GameCard
            title="N-Back"
            description="Advanced working memory test. Remember what you saw 2 steps ago."
            icon={Brain}
            color="bg-cyan-500/20"
            onClick={() => setActiveGame('n_back')}
            bestScore={gameStats.n_back?.bestScore}
            lastPlayed={gameStats.n_back?.lastPlayed}
          />
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              Recent Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {recentSessions.map((session) => (
                  <div 
                    key={session.id}
                    className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl"
                  >
                    <div>
                      <div className="font-medium text-sm">{getGameName(session.game_type)}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(session.created_at), 'MMM d, h:mm a')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{session.score}</div>
                      {session.accuracy && (
                        <div className="text-xs text-muted-foreground">{session.accuracy}% accuracy</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GamesTab;
