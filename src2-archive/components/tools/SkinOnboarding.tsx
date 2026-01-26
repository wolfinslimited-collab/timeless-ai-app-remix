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
  Sparkles,
  Heart,
  Droplets,
  Sun,
  Moon,
  Activity,
  Coffee,
  Target,
  UserRound,
  Smile,
  Frown,
  Meh
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SkinOnboardingProps {
  userId: string;
  onComplete: (profile: SkinProfile) => void;
}

export interface SkinProfile {
  age: number;
  gender: "male" | "female" | "other";
  skin_type: "oily" | "dry" | "combination" | "normal" | "sensitive";
  primary_concerns: string[];
  skin_goals: string[];
  current_routine: "minimal" | "basic" | "moderate" | "advanced";
  sun_exposure: "minimal" | "moderate" | "high";
  water_intake: "low" | "moderate" | "high";
  sleep_quality: "poor" | "average" | "good";
  stress_level: "low" | "moderate" | "high";
  diet_type: "balanced" | "vegetarian" | "vegan" | "keto" | "other";
}

const SKIN_TYPES = [
  { value: "oily", label: "Oily", description: "Shiny, enlarged pores, prone to acne", icon: Sun },
  { value: "dry", label: "Dry", description: "Tight feeling, flaky, rough texture", icon: Droplets },
  { value: "combination", label: "Combination", description: "Oily T-zone, dry cheeks", icon: Activity },
  { value: "normal", label: "Normal", description: "Balanced, few imperfections", icon: Heart },
  { value: "sensitive", label: "Sensitive", description: "Easily irritated, redness-prone", icon: Sparkles },
];

const SKIN_CONCERNS = [
  "Acne",
  "Wrinkles",
  "Dark Spots",
  "Redness",
  "Large Pores",
  "Dullness",
  "Uneven Texture",
  "Dark Circles",
  "Dehydration",
  "Sun Damage",
];

const SKIN_GOALS = [
  "Clearer Skin",
  "Anti-Aging",
  "Even Skin Tone",
  "Hydration",
  "Reduce Oiliness",
  "Minimize Pores",
  "Brighter Complexion",
  "Reduce Redness",
];

const ROUTINES = [
  { value: "minimal", label: "Minimal", description: "Cleanser only" },
  { value: "basic", label: "Basic", description: "Cleanser + Moisturizer" },
  { value: "moderate", label: "Moderate", description: "3-5 products" },
  { value: "advanced", label: "Advanced", description: "6+ products, serums, treatments" },
];

const SkinOnboarding = ({ userId, onComplete }: SkinOnboardingProps) => {
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("female");
  const [skinType, setSkinType] = useState<string>("normal");
  const [primaryConcerns, setPrimaryConcerns] = useState<string[]>([]);
  const [skinGoals, setSkinGoals] = useState<string[]>([]);
  const [currentRoutine, setCurrentRoutine] = useState<string>("basic");
  const [sunExposure, setSunExposure] = useState<string>("moderate");
  const [waterIntake, setWaterIntake] = useState<string>("moderate");
  const [sleepQuality, setSleepQuality] = useState<string>("average");
  const [stressLevel, setStressLevel] = useState<string>("moderate");
  const [dietType, setDietType] = useState<string>("balanced");

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  const toggleConcern = (concern: string) => {
    setPrimaryConcerns(prev => 
      prev.includes(concern) 
        ? prev.filter(c => c !== concern)
        : [...prev, concern]
    );
  };

  const toggleGoal = (goal: string) => {
    setSkinGoals(prev => 
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
        return !!skinType;
      case 3:
        if (primaryConcerns.length === 0) {
          toast.error("Please select at least one concern");
          return false;
        }
        return true;
      case 4:
        if (skinGoals.length === 0) {
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
      const profile: SkinProfile = {
        age: parseInt(age),
        gender,
        skin_type: skinType as SkinProfile["skin_type"],
        primary_concerns: primaryConcerns,
        skin_goals: skinGoals,
        current_routine: currentRoutine as SkinProfile["current_routine"],
        sun_exposure: sunExposure as SkinProfile["sun_exposure"],
        water_intake: waterIntake as SkinProfile["water_intake"],
        sleep_quality: sleepQuality as SkinProfile["sleep_quality"],
        stress_level: stressLevel as SkinProfile["stress_level"],
        diet_type: dietType as SkinProfile["diet_type"],
      };

      const { error } = await supabase.from("skin_profiles").insert({
        user_id: userId,
        ...profile,
      });

      if (error) throw error;

      toast.success("Profile created! Your personalized skin journey begins now.");
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
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Set Up Your Skin Profile</CardTitle>
          <CardDescription>
            Let's personalize your skin analysis and recommendations
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
                  <p className="text-xs text-muted-foreground">
                    Age helps us provide age-appropriate skincare advice
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

          {/* Step 2: Skin Type */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
                <Heart className="h-5 w-5 text-primary" />
                <span className="font-medium">Your Skin Type</span>
              </div>

              <RadioGroup value={skinType} onValueChange={setSkinType} className="space-y-3">
                {SKIN_TYPES.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <Label
                      key={type.value}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                        skinType === type.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <RadioGroupItem value={type.value} className="sr-only" />
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <IconComponent className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{type.label}</p>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                    </Label>
                  );
                })}
              </RadioGroup>
            </div>
          )}

          {/* Step 3: Concerns */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
                <Target className="h-5 w-5 text-primary" />
                <span className="font-medium">Skin Concerns</span>
              </div>

              <p className="text-sm text-muted-foreground">Select all that apply</p>

              <div className="grid grid-cols-2 gap-3">
                {SKIN_CONCERNS.map((concern) => (
                  <Label
                    key={concern}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                      primaryConcerns.includes(concern)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Checkbox 
                      checked={primaryConcerns.includes(concern)}
                      onCheckedChange={() => toggleConcern(concern)}
                    />
                    <span className="text-sm font-medium">{concern}</span>
                  </Label>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Goals */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="font-medium">Skin Goals</span>
              </div>

              <p className="text-sm text-muted-foreground">What do you want to achieve?</p>

              <div className="grid grid-cols-2 gap-3">
                {SKIN_GOALS.map((goal) => (
                  <Label
                    key={goal}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                      skinGoals.includes(goal)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Checkbox 
                      checked={skinGoals.includes(goal)}
                      onCheckedChange={() => toggleGoal(goal)}
                    />
                    <span className="text-sm font-medium">{goal}</span>
                  </Label>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Lifestyle */}
          {step === 5 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10">
                <Activity className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-500">Lifestyle Factors</span>
              </div>

              <div className="space-y-4">
                {/* Current Routine */}
                <div className="space-y-2">
                  <Label className="text-sm">Current Skincare Routine</Label>
                  <RadioGroup value={currentRoutine} onValueChange={setCurrentRoutine} className="grid grid-cols-2 gap-2">
                    {ROUTINES.map((routine) => (
                      <Label
                        key={routine.value}
                        className={cn(
                          "flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all text-center",
                          currentRoutine === routine.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <RadioGroupItem value={routine.value} className="sr-only" />
                        <span className="text-sm font-medium">{routine.label}</span>
                        <span className="text-xs text-muted-foreground">{routine.description}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>

                {/* Sun Exposure */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Sun className="h-4 w-4" /> Daily Sun Exposure
                  </Label>
                  <RadioGroup value={sunExposure} onValueChange={setSunExposure} className="grid grid-cols-3 gap-2">
                    {["minimal", "moderate", "high"].map((level) => (
                      <Label
                        key={level}
                        className={cn(
                          "p-2 rounded-lg border-2 cursor-pointer transition-all text-center capitalize text-sm",
                          sunExposure === level
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <RadioGroupItem value={level} className="sr-only" />
                        {level}
                      </Label>
                    ))}
                  </RadioGroup>
                </div>

                {/* Water Intake */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Droplets className="h-4 w-4" /> Water Intake
                  </Label>
                  <RadioGroup value={waterIntake} onValueChange={setWaterIntake} className="grid grid-cols-3 gap-2">
                    {["low", "moderate", "high"].map((level) => (
                      <Label
                        key={level}
                        className={cn(
                          "p-2 rounded-lg border-2 cursor-pointer transition-all text-center capitalize text-sm",
                          waterIntake === level
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <RadioGroupItem value={level} className="sr-only" />
                        {level}
                      </Label>
                    ))}
                  </RadioGroup>
                </div>

                {/* Sleep Quality */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Moon className="h-4 w-4" /> Sleep Quality
                  </Label>
                  <RadioGroup value={sleepQuality} onValueChange={setSleepQuality} className="grid grid-cols-3 gap-2">
                    {[
                      { value: "poor", Icon: Frown },
                      { value: "average", Icon: Meh },
                      { value: "good", Icon: Smile },
                    ].map(({ value, Icon }) => (
                      <Label
                        key={value}
                        className={cn(
                          "p-2 rounded-lg border-2 cursor-pointer transition-all text-center capitalize text-sm flex flex-col items-center gap-1",
                          sleepQuality === value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <RadioGroupItem value={value} className="sr-only" />
                        <Icon className="h-4 w-4" />
                        {value}
                      </Label>
                    ))}
                  </RadioGroup>
                </div>

                {/* Stress Level */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Stress Level
                  </Label>
                  <RadioGroup value={stressLevel} onValueChange={setStressLevel} className="grid grid-cols-3 gap-2">
                    {["low", "moderate", "high"].map((level) => (
                      <Label
                        key={level}
                        className={cn(
                          "p-2 rounded-lg border-2 cursor-pointer transition-all text-center capitalize text-sm",
                          stressLevel === level
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
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
                    Start Analyzing
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

export default SkinOnboarding;
