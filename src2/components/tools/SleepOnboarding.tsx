import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  User, 
  ChevronRight,
  ChevronLeft,
  Loader2,
  Moon,
  Sun,
  Coffee,
  Activity,
  Smartphone,
  Target,
  UserRound,
  Bed,
  Clock,
  Brain,
  Heart
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SleepOnboardingProps {
  userId: string;
  onComplete: (profile: SleepProfile) => void;
}

export interface SleepProfile {
  age: number;
  gender: "male" | "female" | "other";
  work_schedule: "regular" | "shift" | "flexible" | "remote";
  sleep_goal_hours: number;
  wake_goal_time: string;
  bed_goal_time: string;
  caffeine_intake: "none" | "low" | "moderate" | "high";
  exercise_frequency: "none" | "light" | "moderate" | "intense";
  screen_time_before_bed: "none" | "low" | "moderate" | "high";
  sleep_environment: "poor" | "fair" | "good" | "excellent";
  stress_level: "low" | "moderate" | "high" | "very_high";
  sleep_issues: string[];
  sleep_goals: string[];
}

const WORK_SCHEDULES = [
  { value: "regular", label: "Regular (9-5)", description: "Consistent daytime hours", icon: Clock },
  { value: "shift", label: "Shift Work", description: "Rotating or night shifts", icon: Moon },
  { value: "flexible", label: "Flexible", description: "Variable daily schedule", icon: Activity },
  { value: "remote", label: "Remote", description: "Work from home", icon: Bed },
];

const SLEEP_ISSUES = [
  "Difficulty falling asleep",
  "Waking up frequently",
  "Waking up too early",
  "Snoring",
  "Sleep apnea",
  "Restless legs",
  "Nightmares",
  "Night sweats",
  "Insomnia",
  "Jet lag",
];

const SLEEP_GOALS = [
  "Fall asleep faster",
  "Sleep through the night",
  "Wake up refreshed",
  "Consistent sleep schedule",
  "Reduce snoring",
  "Better sleep quality",
  "More deep sleep",
  "Reduce stress before bed",
];

const SleepOnboarding = ({ userId, onComplete }: SleepOnboardingProps) => {
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("female");
  const [workSchedule, setWorkSchedule] = useState<string>("regular");
  const [sleepGoalHours, setSleepGoalHours] = useState("8");
  const [wakeGoalTime, setWakeGoalTime] = useState("07:00");
  const [bedGoalTime, setBedGoalTime] = useState("23:00");
  const [caffeineIntake, setCaffeineIntake] = useState<string>("moderate");
  const [exerciseFrequency, setExerciseFrequency] = useState<string>("moderate");
  const [screenTime, setScreenTime] = useState<string>("moderate");
  const [sleepEnvironment, setSleepEnvironment] = useState<string>("good");
  const [stressLevel, setStressLevel] = useState<string>("moderate");
  const [sleepIssues, setSleepIssues] = useState<string[]>([]);
  const [sleepGoals, setSleepGoals] = useState<string[]>([]);

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  const toggleIssue = (issue: string) => {
    setSleepIssues(prev => 
      prev.includes(issue) 
        ? prev.filter(i => i !== issue)
        : [...prev, issue]
    );
  };

  const toggleGoal = (goal: string) => {
    setSleepGoals(prev => 
      prev.includes(goal) 
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const validateStep = (): boolean => {
    switch (step) {
      case 1:
        const ageNum = parseInt(age);
        if (!age || isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
          toast.error("Please enter a valid age (13-120)");
          return false;
        }
        return true;
      case 2:
        return !!workSchedule;
      case 3:
        const hours = parseFloat(sleepGoalHours);
        if (isNaN(hours) || hours < 4 || hours > 12) {
          toast.error("Please enter a valid sleep goal (4-12 hours)");
          return false;
        }
        return true;
      case 4:
        if (sleepGoals.length === 0) {
          toast.error("Please select at least one goal");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(s => Math.min(s + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setStep(s => Math.max(s - 1, 1));
  };

  const saveProfile = async () => {
    setIsSaving(true);
    try {
      const profile: SleepProfile = {
        age: parseInt(age),
        gender,
        work_schedule: workSchedule as SleepProfile["work_schedule"],
        sleep_goal_hours: parseFloat(sleepGoalHours),
        wake_goal_time: wakeGoalTime,
        bed_goal_time: bedGoalTime,
        caffeine_intake: caffeineIntake as SleepProfile["caffeine_intake"],
        exercise_frequency: exerciseFrequency as SleepProfile["exercise_frequency"],
        screen_time_before_bed: screenTime as SleepProfile["screen_time_before_bed"],
        sleep_environment: sleepEnvironment as SleepProfile["sleep_environment"],
        stress_level: stressLevel as SleepProfile["stress_level"],
        sleep_issues: sleepIssues,
        sleep_goals: sleepGoals,
      };

      const { error } = await supabase.from("sleep_profiles").insert({
        user_id: userId,
        ...profile,
      });

      if (error) throw error;

      toast.success("Profile created! Your personalized sleep journey begins now.");
      onComplete(profile);
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-border/50">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
            <Moon className="h-8 w-8 text-indigo-400" />
          </div>
          <CardTitle className="text-xl">Set Up Your Sleep Profile</CardTitle>
          <CardDescription>
            Let's personalize your sleep tracking and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Step {step} of {totalSteps}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step 1: Age & Gender */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-500/10">
                <User className="h-5 w-5 text-indigo-400" />
                <span className="font-medium">Basic Information</span>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input
                    type="number"
                    placeholder="Enter your age"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    min={13}
                    max={120}
                  />
                  <p className="text-xs text-muted-foreground">
                    Age affects sleep needs and recommendations
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Gender</Label>
                  <RadioGroup value={gender} onValueChange={(v) => setGender(v as typeof gender)} className="grid grid-cols-3 gap-3">
                    {[
                      { value: "female", label: "Female", Icon: User },
                      { value: "male", label: "Male", Icon: UserRound },
                      { value: "other", label: "Other", Icon: User },
                    ].map((option) => (
                      <Label
                        key={option.value}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all",
                          gender === option.value
                            ? "border-indigo-500 bg-indigo-500/10"
                            : "border-border hover:border-indigo-500/50"
                        )}
                      >
                        <RadioGroupItem value={option.value} className="sr-only" />
                        <option.Icon className="h-6 w-6 text-muted-foreground" />
                        <span className="text-sm font-medium">{option.label}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Work Schedule */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-500/10">
                <Clock className="h-5 w-5 text-indigo-400" />
                <span className="font-medium">Your Work Schedule</span>
              </div>

              <RadioGroup value={workSchedule} onValueChange={setWorkSchedule} className="space-y-3">
                {WORK_SCHEDULES.map((schedule) => {
                  const IconComponent = schedule.icon;
                  return (
                    <Label
                      key={schedule.value}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                        workSchedule === schedule.value
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-border hover:border-indigo-500/50"
                      )}
                    >
                      <RadioGroupItem value={schedule.value} className="sr-only" />
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <IconComponent className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{schedule.label}</p>
                        <p className="text-sm text-muted-foreground">{schedule.description}</p>
                      </div>
                    </Label>
                  );
                })}
              </RadioGroup>
            </div>
          )}

          {/* Step 3: Sleep Schedule Goals */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-500/10">
                <Bed className="h-5 w-5 text-indigo-400" />
                <span className="font-medium">Sleep Schedule Goals</span>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Target Sleep Duration (hours)</Label>
                  <Input
                    type="number"
                    placeholder="8"
                    value={sleepGoalHours}
                    onChange={(e) => setSleepGoalHours(e.target.value)}
                    min={4}
                    max={12}
                    step={0.5}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Moon className="h-4 w-4" /> Bedtime Goal
                    </Label>
                    <Input
                      type="time"
                      value={bedGoalTime}
                      onChange={(e) => setBedGoalTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Sun className="h-4 w-4" /> Wake Time Goal
                    </Label>
                    <Input
                      type="time"
                      value={wakeGoalTime}
                      onChange={(e) => setWakeGoalTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Sleep Goals */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-500/10">
                <Target className="h-5 w-5 text-indigo-400" />
                <span className="font-medium">Sleep Goals</span>
              </div>

              <p className="text-sm text-muted-foreground">What do you want to achieve?</p>

              <div className="grid grid-cols-2 gap-3">
                {SLEEP_GOALS.map((goal) => (
                  <Label
                    key={goal}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                      sleepGoals.includes(goal)
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-border hover:border-indigo-500/50"
                    )}
                  >
                    <Checkbox 
                      checked={sleepGoals.includes(goal)}
                      onCheckedChange={() => toggleGoal(goal)}
                    />
                    <span className="text-sm font-medium">{goal}</span>
                  </Label>
                ))}
              </div>

              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-3">Any sleep issues? (optional)</p>
                <div className="grid grid-cols-2 gap-2">
                  {SLEEP_ISSUES.slice(0, 6).map((issue) => (
                    <Label
                      key={issue}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-xs",
                        sleepIssues.includes(issue)
                          ? "border-orange-500 bg-orange-500/10"
                          : "border-border hover:border-orange-500/50"
                      )}
                    >
                      <Checkbox 
                        checked={sleepIssues.includes(issue)}
                        onCheckedChange={() => toggleIssue(issue)}
                        className="h-3 w-3"
                      />
                      <span>{issue}</span>
                    </Label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Lifestyle */}
          {step === 5 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-500/10">
                <Activity className="h-5 w-5 text-purple-400" />
                <span className="font-medium text-purple-400">Lifestyle Factors</span>
              </div>

              <div className="space-y-4">
                {/* Caffeine */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Coffee className="h-4 w-4" /> Caffeine Intake
                  </Label>
                  <RadioGroup value={caffeineIntake} onValueChange={setCaffeineIntake} className="grid grid-cols-4 gap-2">
                    {["none", "low", "moderate", "high"].map((level) => (
                      <Label
                        key={level}
                        className={cn(
                          "p-2 rounded-lg border-2 cursor-pointer transition-all text-center capitalize text-xs",
                          caffeineIntake === level
                            ? "border-indigo-500 bg-indigo-500/10"
                            : "border-border hover:border-indigo-500/50"
                        )}
                      >
                        <RadioGroupItem value={level} className="sr-only" />
                        {level}
                      </Label>
                    ))}
                  </RadioGroup>
                </div>

                {/* Exercise */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Heart className="h-4 w-4" /> Exercise Frequency
                  </Label>
                  <RadioGroup value={exerciseFrequency} onValueChange={setExerciseFrequency} className="grid grid-cols-4 gap-2">
                    {["none", "light", "moderate", "intense"].map((level) => (
                      <Label
                        key={level}
                        className={cn(
                          "p-2 rounded-lg border-2 cursor-pointer transition-all text-center capitalize text-xs",
                          exerciseFrequency === level
                            ? "border-indigo-500 bg-indigo-500/10"
                            : "border-border hover:border-indigo-500/50"
                        )}
                      >
                        <RadioGroupItem value={level} className="sr-only" />
                        {level}
                      </Label>
                    ))}
                  </RadioGroup>
                </div>

                {/* Screen Time */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Smartphone className="h-4 w-4" /> Screen Time Before Bed
                  </Label>
                  <RadioGroup value={screenTime} onValueChange={setScreenTime} className="grid grid-cols-4 gap-2">
                    {["none", "low", "moderate", "high"].map((level) => (
                      <Label
                        key={level}
                        className={cn(
                          "p-2 rounded-lg border-2 cursor-pointer transition-all text-center capitalize text-xs",
                          screenTime === level
                            ? "border-indigo-500 bg-indigo-500/10"
                            : "border-border hover:border-indigo-500/50"
                        )}
                      >
                        <RadioGroupItem value={level} className="sr-only" />
                        {level}
                      </Label>
                    ))}
                  </RadioGroup>
                </div>

                {/* Stress Level */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4" /> Stress Level
                  </Label>
                  <RadioGroup value={stressLevel} onValueChange={setStressLevel} className="grid grid-cols-4 gap-2">
                    {["low", "moderate", "high", "very_high"].map((level) => (
                      <Label
                        key={level}
                        className={cn(
                          "p-2 rounded-lg border-2 cursor-pointer transition-all text-center capitalize text-xs",
                          stressLevel === level
                            ? "border-indigo-500 bg-indigo-500/10"
                            : "border-border hover:border-indigo-500/50"
                        )}
                      >
                        <RadioGroupItem value={level} className="sr-only" />
                        {level.replace("_", " ")}
                      </Label>
                    ))}
                  </RadioGroup>
                </div>

                {/* Sleep Environment */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Bed className="h-4 w-4" /> Sleep Environment Quality
                  </Label>
                  <RadioGroup value={sleepEnvironment} onValueChange={setSleepEnvironment} className="grid grid-cols-4 gap-2">
                    {["poor", "fair", "good", "excellent"].map((level) => (
                      <Label
                        key={level}
                        className={cn(
                          "p-2 rounded-lg border-2 cursor-pointer transition-all text-center capitalize text-xs",
                          sleepEnvironment === level
                            ? "border-indigo-500 bg-indigo-500/10"
                            : "border-border hover:border-indigo-500/50"
                        )}
                      >
                        <RadioGroupItem value={level} className="sr-only" />
                        {level}
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={step === 1}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            {step < totalSteps ? (
              <Button onClick={nextStep} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={saveProfile} 
                disabled={isSaving}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <Moon className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SleepOnboarding;
