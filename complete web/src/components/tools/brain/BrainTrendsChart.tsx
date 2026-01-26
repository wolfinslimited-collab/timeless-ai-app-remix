import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BrainMetrics } from "./types";
import { format, parseISO } from "date-fns";

interface BrainTrendsChartProps {
  metrics: BrainMetrics[];
  selectedMetrics?: string[];
}

const METRIC_COLORS: Record<string, string> = {
  brain_performance_score: "#a855f7",
  focus_score: "#3b82f6",
  stress_load: "#ef4444",
  mood_stability: "#22c55e",
  reaction_speed: "#f59e0b",
  cognitive_consistency: "#06b6d4",
};

const METRIC_LABELS: Record<string, string> = {
  brain_performance_score: "Brain Performance",
  focus_score: "Focus",
  stress_load: "Stress",
  mood_stability: "Mood",
  reaction_speed: "Reaction",
  cognitive_consistency: "Consistency",
};

const BrainTrendsChart = ({ 
  metrics, 
  selectedMetrics = ['brain_performance_score', 'focus_score', 'stress_load'] 
}: BrainTrendsChartProps) => {
  const chartData = useMemo(() => {
    return metrics
      .slice()
      .sort((a, b) => new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime())
      .map((m) => ({
        date: format(parseISO(m.metric_date), 'MMM d'),
        brain_performance_score: m.brain_performance_score,
        focus_score: m.focus_score,
        stress_load: m.stress_load,
        mood_stability: m.mood_stability,
        reaction_speed: m.reaction_speed,
        cognitive_consistency: m.cognitive_consistency,
      }));
  }, [metrics]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No trend data available yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="date" 
          stroke="hsl(var(--muted-foreground))" 
          fontSize={12}
        />
        <YAxis 
          domain={[0, 100]} 
          stroke="hsl(var(--muted-foreground))" 
          fontSize={12}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))', 
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
        />
        <Legend />
        {selectedMetrics.map((metric) => (
          <Line
            key={metric}
            type="monotone"
            dataKey={metric}
            name={METRIC_LABELS[metric] || metric}
            stroke={METRIC_COLORS[metric] || "#888"}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default BrainTrendsChart;
