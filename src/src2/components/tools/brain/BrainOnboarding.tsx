import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Brain, ArrowRight, Sparkles } from "lucide-react";
import { WORK_SCHEDULES, FOCUS_GOALS } from "./types";

interface BrainOnboardingProps {
  onComplete: (data: {
    age: number;
    gender: string;
    occupation?: string;
    work_schedule: string;
    sleep_goal_hours: number;
    focus_goals: string[];
  }) => void;
}

const BrainOnboarding = ({ onComplete }: BrainOnboardingProps) => {
  const [step, setStep] = useState(1);
  const [age, setAge] = useState<number>(25);
  const [gender, setGender] = useState<string>("prefer_not_to_say");
  const [occupation, setOccupation] = useState<string>("");
  const [workSchedule, setWorkSchedule] = useState<string>("regular");
  const [sleepGoal, setSleepGoal] = useState<number>(8);
  const [focusGoals, setFocusGoals] = useState<string[]>([]);

  const handleGoalToggle = (goal: string) => {
    setFocusGoals(prev => 
      prev.includes(goal) 
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const handleComplete = () => {
    onComplete({
      age,
      gender,
      occupation: occupation || undefined,
      work_schedule: workSchedule,
      sleep_goal_hours: sleepGoal,
      focus_goals: focusGoals,
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1: return age > 0 && gender;
      case 2: return workSchedule;
      case 3: return focusGoals.length > 0;
      default: return true;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mx-auto">
            <Brain className="h-10 w-10 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to Brain AI</h1>
          <p className="text-muted-foreground">
            Let's personalize your cognitive wellness experience
          </p>
        </div>

        {/* Progress */}
        <div className="flex gap-2 justify-center">
          {[1, 2, 3].map((s) => (
            <div 
              key={s}
              className={`h-2 w-16 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-secondary'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="space-y-3">
              <Label>Your Age</Label>
              <Input
                type="number"
                min={13}
                max={120}
                value={age}
                onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                className="text-center text-lg"
              />
            </div>

            <div className="space-y-3">
              <Label>Gender</Label>
              <RadioGroup value={gender} onValueChange={setGender} className="grid grid-cols-2 gap-3">
                {[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'non_binary', label: 'Non-binary' },
                  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
                ].map((option) => (
                  <Label
                    key={option.value}
                    className={`flex items-center justify-center p-3 rounded-xl border cursor-pointer transition-colors ${
                      gender === option.value 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:bg-secondary/50'
                    }`}
                  >
                    <RadioGroupItem value={option.value} className="sr-only" />
                    <span className="text-sm">{option.label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label>Occupation (optional)</Label>
              <Input
                placeholder="e.g., Software Engineer, Student..."
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 2: Work & Sleep */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="space-y-3">
              <Label>Work Schedule</Label>
              <RadioGroup value={workSchedule} onValueChange={setWorkSchedule} className="space-y-2">
                {WORK_SCHEDULES.map((schedule) => (
                  <Label
                    key={schedule.value}
                    className={`flex items-center p-4 rounded-xl border cursor-pointer transition-colors ${
                      workSchedule === schedule.value 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:bg-secondary/50'
                    }`}
                  >
                    <RadioGroupItem value={schedule.value} className="sr-only" />
                    <span>{schedule.label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label>Target Sleep Hours</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min={4}
                  max={12}
                  step={0.5}
                  value={sleepGoal}
                  onChange={(e) => setSleepGoal(parseFloat(e.target.value) || 8)}
                  className="text-center text-lg"
                />
                <span className="text-muted-foreground">hours/night</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Goals */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="space-y-3">
              <Label>What do you want to improve?</Label>
              <p className="text-sm text-muted-foreground">Select all that apply</p>
              <div className="grid grid-cols-2 gap-3">
                {FOCUS_GOALS.map((goal) => (
                  <Label
                    key={goal.value}
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                      focusGoals.includes(goal.value) 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:bg-secondary/50'
                    }`}
                  >
                    <Checkbox 
                      checked={focusGoals.includes(goal.value)}
                      onCheckedChange={() => handleGoalToggle(goal.value)}
                    />
                    <span className="text-sm">{goal.label}</span>
                  </Label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 1 && (
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setStep(s => s - 1)}
            >
              Back
            </Button>
          )}
          
          {step < 3 ? (
            <Button 
              className="flex-1 gap-2"
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              className="flex-1 gap-2"
              onClick={handleComplete}
              disabled={!canProceed()}
            >
              <Sparkles className="h-4 w-4" />
              Start Brain AI
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrainOnboarding;
