import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  User, 
  Ruler, 
  Scale, 
  Target, 
  Activity,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Sparkles,
  Flame,
  Beef,
  Wheat,
  Droplets,
  TrendingDown,
  Dumbbell,
  UserRound
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CalorieOnboardingProps {
  userId: string;
  onComplete: (profile: CalorieProfile) => void;
}

export interface CalorieProfile {
  age: number;
  gender: "male" | "female" | "other";
  height_cm: number;
  weight_kg: number;
  activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
  goal: "lose" | "maintain" | "gain";
  target_weight_kg?: number;
  calculated_bmr: number;
  calculated_tdee: number;
  recommended_calories: number;
  recommended_protein: number;
  recommended_carbs: number;
  recommended_fat: number;
}

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary", description: "Little or no exercise", multiplier: 1.2 },
  { value: "light", label: "Light", description: "Exercise 1-3 days/week", multiplier: 1.375 },
  { value: "moderate", label: "Moderate", description: "Exercise 3-5 days/week", multiplier: 1.55 },
  { value: "active", label: "Active", description: "Exercise 6-7 days/week", multiplier: 1.725 },
  { value: "very_active", label: "Very Active", description: "Hard exercise daily", multiplier: 1.9 },
];

const GOALS = [
  { value: "lose", label: "Lose Weight", description: "Create a calorie deficit", icon: "TrendingDown", calorieAdjust: -500 },
  { value: "maintain", label: "Maintain", description: "Stay at current weight", icon: "Scale", calorieAdjust: 0 },
  { value: "gain", label: "Build Muscle", description: "Gain weight/muscle", icon: "Dumbbell", calorieAdjust: 300 },
] as const;

const CalorieOnboarding = ({ userId, onComplete }: CalorieOnboardingProps) => {
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [activityLevel, setActivityLevel] = useState<string>("moderate");
  const [goal, setGoal] = useState<string>("maintain");
  const [targetWeight, setTargetWeight] = useState("");

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  // Calculate BMR using Mifflin-St Jeor Equation
  const calculateBMR = (age: number, gender: string, height: number, weight: number): number => {
    if (gender === "male") {
      return 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      return 10 * weight + 6.25 * height - 5 * age - 161;
    }
  };

  // Calculate TDEE
  const calculateTDEE = (bmr: number, activityLevel: string): number => {
    const activity = ACTIVITY_LEVELS.find(a => a.value === activityLevel);
    return bmr * (activity?.multiplier || 1.55);
  };

  // Calculate recommended macros
  const calculateMacros = (calories: number, goal: string) => {
    let proteinRatio: number, carbsRatio: number, fatRatio: number;

    if (goal === "lose") {
      // Higher protein for preserving muscle during deficit
      proteinRatio = 0.35;
      fatRatio = 0.30;
      carbsRatio = 0.35;
    } else if (goal === "gain") {
      // Balanced for muscle building
      proteinRatio = 0.30;
      fatRatio = 0.25;
      carbsRatio = 0.45;
    } else {
      // Maintenance
      proteinRatio = 0.25;
      fatRatio = 0.30;
      carbsRatio = 0.45;
    }

    return {
      protein: Math.round((calories * proteinRatio) / 4), // 4 cal per gram
      carbs: Math.round((calories * carbsRatio) / 4),
      fat: Math.round((calories * fatRatio) / 9), // 9 cal per gram
    };
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
        const heightNum = parseFloat(heightCm);
        const weightNum = parseFloat(weightKg);
        if (!heightCm || isNaN(heightNum) || heightNum < 100 || heightNum > 250) {
          toast.error("Please enter a valid height (100-250 cm)");
          return false;
        }
        if (!weightKg || isNaN(weightNum) || weightNum < 30 || weightNum > 300) {
          toast.error("Please enter a valid weight (30-300 kg)");
          return false;
        }
        return true;
      case 3:
        return !!activityLevel;
      case 4:
        return !!goal;
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
      const ageNum = parseInt(age);
      const heightNum = parseFloat(heightCm);
      const weightNum = parseFloat(weightKg);
      
      const bmr = calculateBMR(ageNum, gender, heightNum, weightNum);
      const tdee = calculateTDEE(bmr, activityLevel);
      
      const goalData = GOALS.find(g => g.value === goal);
      const recommendedCalories = Math.round(tdee + (goalData?.calorieAdjust || 0));
      const macros = calculateMacros(recommendedCalories, goal);

      const profile: CalorieProfile = {
        age: ageNum,
        gender: gender,
        height_cm: heightNum,
        weight_kg: weightNum,
        activity_level: activityLevel as CalorieProfile["activity_level"],
        goal: goal as CalorieProfile["goal"],
        target_weight_kg: targetWeight ? parseFloat(targetWeight) : undefined,
        calculated_bmr: Math.round(bmr),
        calculated_tdee: Math.round(tdee),
        recommended_calories: recommendedCalories,
        recommended_protein: macros.protein,
        recommended_carbs: macros.carbs,
        recommended_fat: macros.fat,
      };

      const { error } = await supabase.from("calorie_profiles").insert({
        user_id: userId,
        ...profile,
      });

      if (error) throw error;

      toast.success("Profile created! Your personalized goals are ready.");
      onComplete(profile);
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Preview calculations
  const previewCalories = () => {
    if (!age || !heightCm || !weightKg) return null;
    const bmr = calculateBMR(parseInt(age), gender, parseFloat(heightCm), parseFloat(weightKg));
    const tdee = calculateTDEE(bmr, activityLevel);
    const goalData = GOALS.find(g => g.value === goal);
    return Math.round(tdee + (goalData?.calorieAdjust || 0));
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-border/50">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Set Up Your Profile</CardTitle>
          <CardDescription>
            Let's personalize your calorie and macro goals
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
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
                <User className="h-5 w-5 text-primary" />
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
                </div>

                <div className="space-y-2">
                  <Label>Gender</Label>
                  <RadioGroup value={gender} onValueChange={(v) => setGender(v as typeof gender)} className="grid grid-cols-3 gap-3">
                    {[
                      { value: "male", label: "Male", Icon: UserRound },
                      { value: "female", label: "Female", Icon: User },
                      { value: "other", label: "Other", Icon: User },
                    ].map((option) => (
                      <Label
                        key={option.value}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all",
                          gender === option.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
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

          {/* Step 2: Height & Weight */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
                <Scale className="h-5 w-5 text-primary" />
                <span className="font-medium">Body Measurements</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Ruler className="h-4 w-4" />
                    Height (cm)
                  </Label>
                  <Input
                    type="number"
                    placeholder="170"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    min={100}
                    max={250}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    Weight (kg)
                  </Label>
                  <Input
                    type="number"
                    placeholder="70"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    min={30}
                    max={300}
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Your measurements help calculate your basal metabolic rate (BMR)
              </p>
            </div>
          )}

          {/* Step 3: Activity Level */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
                <Activity className="h-5 w-5 text-primary" />
                <span className="font-medium">Activity Level</span>
              </div>

              <RadioGroup value={activityLevel} onValueChange={setActivityLevel} className="space-y-3">
                {ACTIVITY_LEVELS.map((level) => (
                  <Label
                    key={level.value}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                      activityLevel === level.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <RadioGroupItem value={level.value} className="sr-only" />
                    <div className="flex-1">
                      <p className="font-medium">{level.label}</p>
                      <p className="text-sm text-muted-foreground">{level.description}</p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Step 4: Goal */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
                <Target className="h-5 w-5 text-primary" />
                <span className="font-medium">Your Goal</span>
              </div>

              <RadioGroup value={goal} onValueChange={setGoal} className="space-y-3">
                {GOALS.map((g) => {
                  const IconComponent = g.icon === "TrendingDown" ? TrendingDown : g.icon === "Scale" ? Scale : Dumbbell;
                  return (
                    <Label
                      key={g.value}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                        goal === g.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <RadioGroupItem value={g.value} className="sr-only" />
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <IconComponent className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{g.label}</p>
                        <p className="text-sm text-muted-foreground">{g.description}</p>
                      </div>
                    </Label>
                  );
                })}
              </RadioGroup>

              {goal === "lose" && (
                <div className="space-y-2">
                  <Label>Target Weight (optional)</Label>
                  <Input
                    type="number"
                    placeholder="Enter target weight in kg"
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(e.target.value)}
                    min={30}
                    max={300}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 5: Summary */}
          {step === 5 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10">
                <Sparkles className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-500">Your Personalized Plan</span>
              </div>

              <div className="text-center p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <Flame className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-4xl font-bold">{previewCalories()}</p>
                <p className="text-muted-foreground">Daily Calories</p>
              </div>

              {previewCalories() && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-red-500/10">
                    <Beef className="h-5 w-5 text-red-400 mx-auto mb-1" />
                    <p className="text-lg font-bold">{calculateMacros(previewCalories()!, goal).protein}g</p>
                    <p className="text-xs text-muted-foreground">Protein</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-amber-500/10">
                    <Wheat className="h-5 w-5 text-amber-400 mx-auto mb-1" />
                    <p className="text-lg font-bold">{calculateMacros(previewCalories()!, goal).carbs}g</p>
                    <p className="text-xs text-muted-foreground">Carbs</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-yellow-500/10">
                    <Droplets className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
                    <p className="text-lg font-bold">{calculateMacros(previewCalories()!, goal).fat}g</p>
                    <p className="text-xs text-muted-foreground">Fat</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-muted-foreground">Age</p>
                  <p className="font-medium">{age} years</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-muted-foreground">Gender</p>
                  <p className="font-medium capitalize">{gender}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-muted-foreground">Height</p>
                  <p className="font-medium">{heightCm} cm</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-muted-foreground">Weight</p>
                  <p className="font-medium">{weightKg} kg</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-4">
            {step > 1 && (
              <Button variant="outline" onClick={prevStep} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            {step < totalSteps ? (
              <Button className="flex-1 gap-2" onClick={nextStep}>
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button className="flex-1 gap-2" onClick={saveProfile} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Profile...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Start Tracking
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

export default CalorieOnboarding;
