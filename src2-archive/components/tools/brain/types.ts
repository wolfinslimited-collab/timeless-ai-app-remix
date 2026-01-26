export interface BrainProfile {
  id: string;
  user_id: string;
  age: number;
  gender: string;
  occupation?: string;
  work_schedule: string;
  sleep_goal_hours: number;
  focus_goals: string[];
  baseline_established: boolean;
  baseline_start_date?: string;
  created_at: string;
  updated_at: string;
}

export interface BrainMetrics {
  id: string;
  user_id: string;
  metric_date: string;
  brain_performance_score?: number;
  focus_score?: number;
  stress_load?: number;
  mood_stability?: number;
  reaction_speed?: number;
  cognitive_consistency?: number;
  total_screen_time_minutes: number;
  app_switches: number;
  deep_work_minutes: number;
  night_usage_minutes: number;
  notification_interactions: number;
  session_count: number;
  avg_session_length_minutes: number;
  self_reported_mood?: number;
  self_reported_energy?: number;
  self_reported_focus?: number;
  mood_notes?: string;
  insights: BrainInsight[];
  created_at: string;
  updated_at: string;
}

export interface BrainInsight {
  type: 'positive' | 'warning' | 'neutral';
  title: string;
  description: string;
  metric?: string;
}

export interface BrainMoodLog {
  id: string;
  user_id: string;
  logged_at: string;
  mood_score: number;
  energy_level?: number;
  focus_level?: number;
  stress_level?: number;
  notes?: string;
  context?: 'morning' | 'afternoon' | 'evening' | 'night';
  created_at: string;
}

export interface BrainAppSession {
  id: string;
  user_id: string;
  session_start: string;
  session_end?: string;
  duration_minutes?: number;
  app_category?: 'productivity' | 'social' | 'entertainment' | 'education' | 'other';
  app_switches_during: number;
  is_deep_work: boolean;
  created_at: string;
}

export const WORK_SCHEDULES = [
  { value: 'regular', label: '9-5 Regular' },
  { value: 'flexible', label: 'Flexible Hours' },
  { value: 'shift', label: 'Shift Work' },
  { value: 'remote', label: 'Remote/Hybrid' },
  { value: 'student', label: 'Student Schedule' },
] as const;

export const FOCUS_GOALS = [
  { value: 'improve_focus', label: 'Improve Focus' },
  { value: 'reduce_stress', label: 'Reduce Stress' },
  { value: 'better_sleep', label: 'Better Sleep' },
  { value: 'productivity', label: 'Boost Productivity' },
  { value: 'mindfulness', label: 'Be More Mindful' },
  { value: 'reduce_screen_time', label: 'Reduce Screen Time' },
] as const;

export const MOOD_CONTEXTS = [
  { value: 'morning', label: 'Morning', icon: '🌅' },
  { value: 'afternoon', label: 'Afternoon', icon: '☀️' },
  { value: 'evening', label: 'Evening', icon: '🌆' },
  { value: 'night', label: 'Night', icon: '🌙' },
] as const;
