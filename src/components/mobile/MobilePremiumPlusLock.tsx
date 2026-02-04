import { Lock, Crown, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Screen } from "./MobileNav";

interface MobilePremiumPlusLockProps {
  feature: string;
  description: string;
  onBack?: () => void;
  onUpgrade?: () => void;
}

export function MobilePremiumPlusLock({ 
  feature, 
  description, 
  onBack, 
  onUpgrade 
}: MobilePremiumPlusLockProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header with back button */}
      <div className="px-4 py-2">
        {onBack && (
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
        )}
      </div>

      {/* Lock content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Lock icon with glow effect */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
          <div className="relative w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center">
            <Lock className="w-10 h-10 text-primary" />
          </div>
        </div>

        {/* Premium Plus badge */}
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
          <Crown className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary">Premium Plus Required</span>
        </div>

        {/* Feature name */}
        <h2 className="text-2xl font-bold text-foreground mb-2">{feature}</h2>

        {/* Description */}
        <p className="text-muted-foreground text-sm mb-8 max-w-[280px]">
          {description}
        </p>

        {/* Upgrade button */}
        {onUpgrade && (
          <button
            onClick={onUpgrade}
            className={cn(
              "w-full max-w-[280px] py-4 rounded-2xl font-semibold",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 transition-all",
              "flex items-center justify-center gap-2"
            )}
          >
            <Crown className="w-5 h-5" />
            Upgrade to Premium Plus
          </button>
        )}

        {/* Features list */}
        <div className="mt-8 text-left w-full max-w-[280px]">
          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">
            Premium Plus includes:
          </p>
          <ul className="space-y-2">
            <FeatureItem text="AI Apps Suite - All 7 AI-powered apps" />
            <FeatureItem text="Cinema Studio - Professional video editing" />
            <FeatureItem text="Priority generation queue" />
            <FeatureItem text="Unlimited downloads" />
          </ul>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2 text-sm text-foreground">
      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
      {text}
    </li>
  );
}
