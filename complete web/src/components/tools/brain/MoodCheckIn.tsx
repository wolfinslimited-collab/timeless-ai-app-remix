import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { MOOD_CONTEXTS } from "./types";
import { Smile, Frown, Meh, Zap, Target, Brain } from "lucide-react";

interface MoodCheckInProps {
  onSubmit: (data: {
    mood_score: number;
    energy_level: number;
    focus_level: number;
    stress_level: number;
    notes?: string;
    context: string;
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const MoodCheckIn = ({ onSubmit, onCancel, isLoading }: MoodCheckInProps) => {
  const [mood, setMood] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [focus, setFocus] = useState(5);
  const [stress, setStress] = useState(5);
  const [notes, setNotes] = useState("");
  const [context, setContext] = useState(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  });

  const getMoodEmoji = (value: number) => {
    if (value >= 8) return <Smile className="h-6 w-6 text-emerald-400" />;
    if (value >= 5) return <Meh className="h-6 w-6 text-amber-400" />;
    return <Frown className="h-6 w-6 text-rose-400" />;
  };

  const handleSubmit = () => {
    onSubmit({
      mood_score: mood,
      energy_level: energy,
      focus_level: focus,
      stress_level: stress,
      notes: notes || undefined,
      context,
    });
  };

  return (
    <div className="space-y-6 p-4 bg-card rounded-2xl border border-border/50">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Quick Check-In</h3>
        <p className="text-sm text-muted-foreground">
          How are you feeling right now?
        </p>
      </div>

      {/* Context selector */}
      <div className="flex justify-center gap-2">
        {MOOD_CONTEXTS.map((ctx) => (
          <button
            key={ctx.value}
            onClick={() => setContext(ctx.value)}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              context === ctx.value 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-secondary/50 hover:bg-secondary'
            }`}
          >
            <span className="mr-1">{ctx.icon}</span>
            {ctx.label}
          </button>
        ))}
      </div>

      {/* Mood slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            {getMoodEmoji(mood)}
            Mood
          </Label>
          <span className="text-lg font-semibold">{mood}/10</span>
        </div>
        <Slider
          value={[mood]}
          onValueChange={(v) => setMood(v[0])}
          min={1}
          max={10}
          step={1}
          className="py-2"
        />
      </div>

      {/* Energy slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" />
            Energy
          </Label>
          <span className="text-lg font-semibold">{energy}/10</span>
        </div>
        <Slider
          value={[energy]}
          onValueChange={(v) => setEnergy(v[0])}
          min={1}
          max={10}
          step={1}
          className="py-2"
        />
      </div>

      {/* Focus slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-400" />
            Focus
          </Label>
          <span className="text-lg font-semibold">{focus}/10</span>
        </div>
        <Slider
          value={[focus]}
          onValueChange={(v) => setFocus(v[0])}
          min={1}
          max={10}
          step={1}
          className="py-2"
        />
      </div>

      {/* Stress slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-rose-400" />
            Stress
          </Label>
          <span className="text-lg font-semibold">{stress}/10</span>
        </div>
        <Slider
          value={[stress]}
          onValueChange={(v) => setStress(v[0])}
          min={1}
          max={10}
          step={1}
          className="py-2"
        />
        <p className="text-xs text-muted-foreground">
          1 = Very relaxed, 10 = Very stressed
        </p>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notes (optional)</Label>
        <Textarea
          placeholder="How are you feeling? What's on your mind?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? "Saving..." : "Log Check-In"}
        </Button>
      </div>
    </div>
  );
};

export default MoodCheckIn;
