import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Sun, 
  Moon, 
  Droplets, 
  Sparkles,
  ShieldCheck,
  Leaf,
  Clock,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SkinConcern {
  name: string;
  severity: "mild" | "moderate" | "severe";
  description: string;
}

interface SkinProfile {
  age?: number;
  gender?: string;
  skin_type?: string;
  primary_concerns?: string[];
  skin_goals?: string[];
  current_routine?: string;
  sun_exposure?: string;
  water_intake?: string;
  sleep_quality?: string;
  stress_level?: string;
  diet_type?: string;
}

interface SkinAnalysis {
  skin_type: string;
  overall_score: number;
  hydration_level: number | null;
  oiliness_level: number | null;
  concerns: SkinConcern[];
  recommendations: string[];
}

interface RoutineStep {
  id: string;
  order: number;
  name: string;
  description: string;
  productType: string;
  duration: string;
  isOptional: boolean;
  tips?: string;
  icon: React.ReactNode;
}

interface SkinRoutineBuilderProps {
  skinProfile: SkinProfile | null;
  latestAnalysis: SkinAnalysis | null;
  compact?: boolean;
}

// Base routine steps with customization options
const MORNING_BASE_STEPS: Omit<RoutineStep, "icon">[] = [
  {
    id: "am-cleanse",
    order: 1,
    name: "Gentle Cleanser",
    description: "Start with a gentle cleanser to remove overnight buildup",
    productType: "Cleanser",
    duration: "1 min",
    isOptional: false,
  },
  {
    id: "am-toner",
    order: 2,
    name: "Hydrating Toner",
    description: "Balance your skin's pH and prep for treatments",
    productType: "Toner",
    duration: "30 sec",
    isOptional: true,
  },
  {
    id: "am-serum",
    order: 3,
    name: "Vitamin C Serum",
    description: "Antioxidant protection and brightening",
    productType: "Serum",
    duration: "1 min",
    isOptional: false,
  },
  {
    id: "am-eye",
    order: 4,
    name: "Eye Cream",
    description: "Target dark circles and fine lines",
    productType: "Eye Care",
    duration: "30 sec",
    isOptional: true,
  },
  {
    id: "am-moisturize",
    order: 5,
    name: "Moisturizer",
    description: "Lock in hydration for the day",
    productType: "Moisturizer",
    duration: "1 min",
    isOptional: false,
  },
  {
    id: "am-spf",
    order: 6,
    name: "Sunscreen SPF 30+",
    description: "Essential protection from UV damage",
    productType: "Sunscreen",
    duration: "1 min",
    isOptional: false,
    tips: "Apply 15 minutes before sun exposure",
  },
];

const EVENING_BASE_STEPS: Omit<RoutineStep, "icon">[] = [
  {
    id: "pm-cleanse1",
    order: 1,
    name: "Oil Cleanser",
    description: "Remove makeup and sunscreen",
    productType: "Cleanser",
    duration: "1 min",
    isOptional: true,
    tips: "Especially important if wearing makeup",
  },
  {
    id: "pm-cleanse2",
    order: 2,
    name: "Gentle Cleanser",
    description: "Deep clean and remove remaining impurities",
    productType: "Cleanser",
    duration: "1 min",
    isOptional: false,
  },
  {
    id: "pm-exfoliate",
    order: 3,
    name: "Exfoliant",
    description: "Chemical exfoliation for cell turnover",
    productType: "Treatment",
    duration: "As directed",
    isOptional: true,
    tips: "Use 2-3 times per week, not daily",
  },
  {
    id: "pm-toner",
    order: 4,
    name: "Toner",
    description: "Prep skin for treatments",
    productType: "Toner",
    duration: "30 sec",
    isOptional: true,
  },
  {
    id: "pm-serum",
    order: 5,
    name: "Treatment Serum",
    description: "Target specific concerns",
    productType: "Serum",
    duration: "1 min",
    isOptional: false,
  },
  {
    id: "pm-eye",
    order: 6,
    name: "Eye Cream",
    description: "Nourish delicate eye area overnight",
    productType: "Eye Care",
    duration: "30 sec",
    isOptional: true,
  },
  {
    id: "pm-moisturize",
    order: 7,
    name: "Night Cream",
    description: "Rich moisturizer for overnight repair",
    productType: "Moisturizer",
    duration: "1 min",
    isOptional: false,
  },
  {
    id: "pm-treatment",
    order: 8,
    name: "Spot Treatment",
    description: "Target specific blemishes",
    productType: "Treatment",
    duration: "30 sec",
    isOptional: true,
  },
];

const getStepIcon = (productType: string) => {
  switch (productType) {
    case "Cleanser":
      return <Droplets className="h-4 w-4" />;
    case "Sunscreen":
      return <ShieldCheck className="h-4 w-4" />;
    case "Serum":
    case "Treatment":
      return <Sparkles className="h-4 w-4" />;
    case "Moisturizer":
      return <Leaf className="h-4 w-4" />;
    default:
      return <Droplets className="h-4 w-4" />;
  }
};

export const SkinRoutineBuilder = ({ 
  skinProfile, 
  latestAnalysis,
  compact = false 
}: SkinRoutineBuilderProps) => {
  // Generate personalized routine based on profile and analysis
  const { morningRoutine, eveningRoutine, routineLevel, totalTime } = useMemo(() => {
    const skinType = latestAnalysis?.skin_type || skinProfile?.skin_type || "normal";
    const concerns = [
      ...(latestAnalysis?.concerns?.map(c => c.name.toLowerCase()) || []),
      ...(skinProfile?.primary_concerns?.map(c => c.toLowerCase()) || []),
    ];
    const goals = skinProfile?.skin_goals?.map(g => g.toLowerCase()) || [];
    const routineLevel = skinProfile?.current_routine || "basic";
    const age = skinProfile?.age || 25;
    const sunExposure = skinProfile?.sun_exposure || "moderate";
    const hydration = latestAnalysis?.hydration_level || 50;
    const oiliness = latestAnalysis?.oiliness_level || 50;

    // Customize morning routine
    let morning = MORNING_BASE_STEPS.map(step => ({
      ...step,
      icon: getStepIcon(step.productType),
    }));

    // Customize based on skin type
    if (skinType === "oily") {
      morning = morning.map(step => {
        if (step.id === "am-cleanse") {
          return { ...step, name: "Foaming Cleanser", description: "Oil-control cleanser to start fresh" };
        }
        if (step.id === "am-moisturize") {
          return { ...step, name: "Oil-Free Moisturizer", description: "Lightweight hydration without clogging pores" };
        }
        return step;
      });
    } else if (skinType === "dry") {
      morning = morning.map(step => {
        if (step.id === "am-cleanse") {
          return { ...step, name: "Cream Cleanser", description: "Hydrating cleanser that won't strip moisture" };
        }
        if (step.id === "am-moisturize") {
          return { ...step, name: "Rich Moisturizer", description: "Deep hydration for dry skin" };
        }
        return step;
      });
      // Make toner essential for dry skin
      morning = morning.map(step => 
        step.id === "am-toner" ? { ...step, isOptional: false, name: "Hydrating Essence" } : step
      );
    } else if (skinType === "sensitive") {
      morning = morning.map(step => {
        if (step.id === "am-serum") {
          return { ...step, name: "Calming Serum", description: "Soothing ingredients like centella or niacinamide" };
        }
        return step;
      });
    }

    // Add anti-aging focus for age 30+
    if (age >= 30 || goals.includes("anti-aging")) {
      morning = morning.map(step => {
        if (step.id === "am-eye") {
          return { ...step, isOptional: false, tips: "Target crow's feet and fine lines" };
        }
        return step;
      });
    }

    // Prioritize SPF for high sun exposure
    if (sunExposure === "high") {
      morning = morning.map(step => {
        if (step.id === "am-spf") {
          return { ...step, name: "Sunscreen SPF 50+", tips: "Reapply every 2 hours when outdoors" };
        }
        return step;
      });
    }

    // Customize evening routine
    let evening = EVENING_BASE_STEPS.map(step => ({
      ...step,
      icon: getStepIcon(step.productType),
    }));

    // Customize based on skin type and concerns
    if (skinType === "oily" || concerns.includes("acne")) {
      evening = evening.map(step => {
        if (step.id === "pm-serum") {
          return { ...step, name: "Salicylic Acid Serum", description: "BHA to unclog pores and reduce breakouts" };
        }
        if (step.id === "pm-treatment") {
          return { ...step, isOptional: false, name: "Acne Spot Treatment", description: "Target active breakouts" };
        }
        return step;
      });
    } else if (skinType === "dry" || hydration < 40) {
      evening = evening.map(step => {
        if (step.id === "pm-serum") {
          return { ...step, name: "Hyaluronic Acid Serum", description: "Deep hydration boost" };
        }
        if (step.id === "pm-moisturize") {
          return { ...step, name: "Overnight Mask", description: "Intensive hydration while you sleep" };
        }
        return step;
      });
    }

    // Anti-aging evening routine
    if (age >= 25 || goals.includes("anti-aging") || concerns.includes("wrinkles")) {
      evening = evening.map(step => {
        if (step.id === "pm-serum") {
          return { ...step, name: "Retinol Serum", description: "Boost cell turnover and reduce fine lines", tips: "Start with low concentration, use 2-3x/week" };
        }
        return step;
      });
    }

    // Brightening focus
    if (concerns.includes("dark spots") || concerns.includes("dullness") || goals.includes("brighter complexion")) {
      evening = evening.map(step => {
        if (step.id === "pm-exfoliate") {
          return { ...step, isOptional: false, name: "AHA Exfoliant", description: "Glycolic or lactic acid for radiance" };
        }
        return step;
      });
    }

    // Dark circles focus
    if (concerns.includes("dark circles")) {
      morning = morning.map(step => 
        step.id === "am-eye" ? { ...step, isOptional: false } : step
      );
      evening = evening.map(step => 
        step.id === "pm-eye" ? { ...step, isOptional: false } : step
      );
    }

    // Simplify routine based on user's routine level
    if (routineLevel === "minimal") {
      morning = morning.filter(step => ["am-cleanse", "am-moisturize", "am-spf"].includes(step.id));
      evening = evening.filter(step => ["pm-cleanse2", "pm-moisturize"].includes(step.id));
    } else if (routineLevel === "basic") {
      morning = morning.filter(step => !step.isOptional || step.id === "am-serum");
      evening = evening.filter(step => !step.isOptional);
    }

    // Calculate total time
    const parseTime = (duration: string) => {
      if (duration.includes("min")) return parseInt(duration) || 1;
      if (duration.includes("sec")) return 0.5;
      return 1;
    };
    const morningTime = morning.reduce((sum, step) => sum + parseTime(step.duration), 0);
    const eveningTime = evening.reduce((sum, step) => sum + parseTime(step.duration), 0);

    return {
      morningRoutine: morning,
      eveningRoutine: evening,
      routineLevel,
      totalTime: { morning: Math.ceil(morningTime), evening: Math.ceil(eveningTime) },
    };
  }, [skinProfile, latestAnalysis]);

  const RoutineCard = ({ 
    title, 
    icon, 
    steps, 
    time,
    variant 
  }: { 
    title: string; 
    icon: React.ReactNode; 
    steps: RoutineStep[]; 
    time: number;
    variant: "morning" | "evening";
  }) => (
    <Card className={cn(
      "border-border/50",
      variant === "morning" ? "bg-gradient-to-br from-amber-500/5 to-orange-500/5" : "bg-gradient-to-br from-indigo-500/5 to-purple-500/5"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            ~{time} min
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg transition-colors",
                step.isOptional ? "bg-secondary/30" : "bg-secondary/50"
              )}
            >
              <div className={cn(
                "flex items-center justify-center h-8 w-8 rounded-full shrink-0",
                variant === "morning" ? "bg-amber-500/20 text-amber-600" : "bg-indigo-500/20 text-indigo-600"
              )}>
                {step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{step.name}</p>
                  {step.isOptional && (
                    <Badge variant="outline" className="text-xs py-0">Optional</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                {step.tips && (
                  <p className="text-xs text-primary mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {step.tips}
                  </p>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{step.duration}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  if (compact) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Your Daily Routine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-amber-500/10 text-center">
              <Sun className="h-5 w-5 text-amber-600 mx-auto mb-1" />
              <p className="text-sm font-medium">Morning</p>
              <p className="text-xs text-muted-foreground">{morningRoutine.length} steps • ~{totalTime.morning} min</p>
            </div>
            <div className="p-3 rounded-lg bg-indigo-500/10 text-center">
              <Moon className="h-5 w-5 text-indigo-600 mx-auto mb-1" />
              <p className="text-sm font-medium">Evening</p>
              <p className="text-xs text-muted-foreground">{eveningRoutine.length} steps • ~{totalTime.evening} min</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Personalized for {skinProfile?.skin_type || latestAnalysis?.skin_type || "your"} skin
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Your Personalized Routine
        </h2>
        <p className="text-sm text-muted-foreground">
          Customized for {skinProfile?.skin_type || latestAnalysis?.skin_type || "your"} skin
          {skinProfile?.current_routine && ` • ${skinProfile.current_routine} level`}
        </p>
      </div>

      {/* Routines Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <RoutineCard
          title="Morning Routine"
          icon={<Sun className="h-4 w-4 text-amber-500" />}
          steps={morningRoutine}
          time={totalTime.morning}
          variant="morning"
        />
        <RoutineCard
          title="Evening Routine"
          icon={<Moon className="h-4 w-4 text-indigo-500" />}
          steps={eveningRoutine}
          time={totalTime.evening}
          variant="evening"
        />
      </div>

      {/* Tips Section */}
      <Card className="border-border/50 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Pro Tips</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                <li>• Wait 1-2 minutes between serum and moisturizer for better absorption</li>
                <li>• Apply products from thinnest to thickest consistency</li>
                <li>• Don't skip sunscreen even on cloudy days</li>
                {skinProfile?.water_intake === "low" && (
                  <li>• Drink more water! Hydration starts from within</li>
                )}
                {skinProfile?.sleep_quality === "poor" && (
                  <li>• Better sleep = better skin. Aim for 7-8 hours nightly</li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SkinRoutineBuilder;
