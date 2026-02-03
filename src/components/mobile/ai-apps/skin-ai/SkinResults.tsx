import { ArrowLeft, Share, Home, RefreshCw, Droplets, Sun, Moon, Heart, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SkinAnalysisResult, SkinConcern } from "./SkinAnalyzing";

interface SkinResultsProps {
  result: SkinAnalysisResult;
  onBack: () => void;
  onRetake: () => void;
}

function getSkinTypeLabel(skinType: string): string {
  switch (skinType.toLowerCase()) {
    case "oily":
      return "Oily Skin";
    case "dry":
      return "Dry Skin";
    case "combination":
      return "Combination Skin";
    case "sensitive":
      return "Sensitive Skin";
    default:
      return "Normal Skin";
  }
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Attention";
}

export function SkinResults({ result, onBack, onRetake }: SkinResultsProps) {
  const recommendationIcons = [Droplets, Sun, Moon, Heart, Sparkles];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <button onClick={onBack} className="p-1">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground">Skin Analysis Results</h1>
        <button className="p-1">
          <Share className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Overall Score Card */}
        <div className="p-6 bg-secondary rounded-2xl border border-border text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
            <span className="text-muted-foreground font-medium">Skin Score</span>
          </div>
          <div className="flex items-baseline justify-center gap-1 mb-2">
            <span className="text-5xl font-bold text-foreground">{result.overallScore}</span>
            <span className="text-xl text-muted-foreground">/100</span>
          </div>
          <p className="text-sm text-muted-foreground">{getScoreLabel(result.overallScore)}</p>
        </div>

        {/* Summary */}
        {result.analysisSummary && (
          <div className="p-4 bg-secondary rounded-2xl border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-foreground">Summary</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {result.analysisSummary}
            </p>
          </div>
        )}

        {/* Detailed Analysis */}
        <div>
          <h3 className="text-lg font-bold text-foreground mb-4">Detailed Analysis</h3>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              icon={Droplets}
              title="Hydration"
              value={result.hydrationLevel}
              status={result.hydrationLevel >= 60 ? "Good" : "Low"}
            />
            <MetricCard
              icon={Sun}
              title="Oiliness"
              value={result.oilinessLevel}
              status={result.oilinessLevel <= 40 ? "Low" : result.oilinessLevel <= 60 ? "Normal" : "High"}
            />
            <MetricCard
              icon={Heart}
              title="Skin Type"
              displayText={result.skinType.toUpperCase()}
              status=""
            />
            <MetricCard
              icon={Sparkles}
              title="Overall Score"
              value={result.overallScore}
              status={getScoreLabel(result.overallScore)}
            />
          </div>
        </div>

        {/* Detected Concerns */}
        {result.concerns.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">Detected Concerns</h3>
            <div className="space-y-3">
              {result.concerns.map((concern, index) => (
                <ConcernCard key={index} concern={concern} />
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {result.recommendations.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">Recommendations</h3>
            <div className="space-y-3">
              {result.recommendations.map((rec, index) => {
                const Icon = recommendationIcons[index % recommendationIcons.length];
                return (
                  <div
                    key={index}
                    className="p-4 bg-secondary rounded-xl border border-border flex items-start gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground pt-2">{rec}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="p-4 border-t border-border flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-4 rounded-xl border border-border flex items-center justify-center gap-2 text-foreground font-medium"
        >
          <Home className="w-5 h-5" />
          Home
        </button>
        <button
          onClick={onRetake}
          className="flex-1 py-4 rounded-xl bg-primary text-primary-foreground flex items-center justify-center gap-2 font-medium"
        >
          <RefreshCw className="w-5 h-5" />
          Retake
        </button>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  title,
  value,
  displayText,
  status,
}: {
  icon: typeof Droplets;
  title: string;
  value?: number;
  displayText?: string;
  status: string;
}) {
  return (
    <div className="p-4 bg-secondary rounded-xl border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-card flex items-center justify-center">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="text-xl font-bold text-foreground">
          {displayText || `${value}%`}
        </span>
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {status && <p className="text-xs text-muted-foreground">{status}</p>}
    </div>
  );
}

function ConcernCard({ concern }: { concern: SkinConcern }) {
  return (
    <div className="p-4 bg-secondary rounded-xl border border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-foreground">{concern.name}</span>
        <span
          className={cn(
            "text-xs px-2.5 py-1 rounded-full bg-card border border-border text-muted-foreground"
          )}
        >
          {concern.severity}
        </span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{concern.description}</p>
    </div>
  );
}
