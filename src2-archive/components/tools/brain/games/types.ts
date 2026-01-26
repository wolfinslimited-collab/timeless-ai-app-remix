export interface GameResult {
  game_type: 'reaction_time' | 'memory_pairs' | 'n_back';
  score: number;
  accuracy?: number;
  avg_reaction_time_ms?: number;
  best_reaction_time_ms?: number;
  level_reached?: number;
  moves_made?: number;
  correct_responses?: number;
  incorrect_responses?: number;
  duration_seconds?: number;
  metadata?: Record<string, unknown>;
}

export interface GameSession {
  id: string;
  user_id: string;
  game_type: string;
  score: number;
  accuracy?: number;
  avg_reaction_time_ms?: number;
  best_reaction_time_ms?: number;
  level_reached?: number;
  moves_made?: number;
  correct_responses?: number;
  incorrect_responses?: number;
  duration_seconds?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface GameProps {
  onComplete: (result: GameResult) => void;
  onClose: () => void;
}
