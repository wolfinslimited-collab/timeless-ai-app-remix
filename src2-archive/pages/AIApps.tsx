import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TopMenu from "@/components/TopMenu";
// Footer removed from AI Apps pages
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import CalorieAITool from "@/components/tools/CalorieAITool";
import SkinAITool from "@/components/tools/SkinAITool";
import SleepAITool from "@/components/tools/SleepAITool";
import NotifyAITool from "@/components/tools/NotifyAITool";
import FinancialAITool from "@/components/tools/FinancialAITool";
import FingerprintAITool from "@/components/tools/FingerprintAITool";
import BrainAITool from "@/components/tools/BrainAITool";
import {
  Bell,
  Moon,
  Brain,
  Sparkles,
  DollarSign,
  Apple,
  Fingerprint,
  Megaphone,
  ArrowRight,
  ArrowLeft,
  Clock,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type AppCategory = "all" | "health" | "productivity" | "finance" | "marketing" | "security";

interface AIApp {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  category: AppCategory;
  badge?: "NEW" | "POPULAR" | "BETA" | "SOON";
  gradient: string;
  comingSoon?: boolean;
}

const aiApps: AIApp[] = [
  {
    id: "notify-ai",
    name: "Notify AI",
    description: "Smart notifications that learn your preferences",
    icon: Bell,
    category: "productivity",
    badge: "POPULAR",
    gradient: "from-amber-500/20 to-orange-500/20",
    comingSoon: false,
  },
  {
    id: "sleep-ai",
    name: "Sleep AI",
    description: "Optimize your sleep patterns with AI analysis",
    icon: Moon,
    category: "health",
    badge: "NEW",
    gradient: "from-indigo-500/20 to-purple-500/20",
    comingSoon: false,
  },
  {
    id: "brain-ai",
    name: "Brain AI",
    description: "Cognitive wellness & focus tracking powered by AI",
    icon: Brain,
    category: "productivity",
    badge: "NEW",
    gradient: "from-violet-500/20 to-purple-500/20",
    comingSoon: false,
  },
  {
    id: "skin-ai",
    name: "Skin AI",
    description: "AI-powered skin analysis and care recommendations",
    icon: Sparkles,
    category: "health",
    badge: "NEW",
    gradient: "from-pink-500/20 to-rose-500/20",
    comingSoon: false,
  },
  {
    id: "financial-ai",
    name: "Financial AI",
    description: "AI-powered market research with technical, fundamental & sentiment analysis",
    icon: DollarSign,
    category: "finance",
    badge: "NEW",
    gradient: "from-emerald-500/20 to-green-500/20",
    comingSoon: false,
  },
  {
    id: "calorie-ai",
    name: "Calorie AI",
    description: "Track and optimize your nutrition with AI",
    icon: Apple,
    category: "health",
    badge: "NEW",
    gradient: "from-lime-500/20 to-green-500/20",
    comingSoon: false,
  },
  {
    id: "fingerprint-ai",
    name: "Fingerprint AI",
    description: "Discover social profiles and public info about anyone",
    icon: Fingerprint,
    category: "productivity",
    badge: "NEW",
    gradient: "from-slate-500/20 to-zinc-500/20",
    comingSoon: false,
  },
  {
    id: "ads-ai",
    name: "Ads AI",
    description: "Create high-converting ad campaigns with AI",
    icon: Megaphone,
    category: "marketing",
    badge: "SOON",
    gradient: "from-orange-500/20 to-red-500/20",
    comingSoon: true,
  },
];

const categories: { id: AppCategory; label: string }[] = [
  { id: "all", label: "All Apps" },
  { id: "health", label: "Health & Wellness" },
  { id: "productivity", label: "Productivity" },
  { id: "finance", label: "Finance" },
  { id: "marketing", label: "Marketing" },
  { id: "security", label: "Security" },
];

const AIApps = () => {
  const navigate = useNavigate();
  const { appId } = useParams();
  const [selectedCategory, setSelectedCategory] = useState<AppCategory>("all");

  const filteredApps = aiApps.filter((app) => {
    const matchesCategory = selectedCategory === "all" || app.category === selectedCategory;
    return matchesCategory;
  });

  const handleAppClick = (appId: string) => {
    navigate(`/ai-apps/${appId}`);
  };

  const handleBack = () => {
    navigate("/ai-apps");
  };

  // Render specific app tool if appId is provided
  if (appId === "calorie-ai") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopMenu />
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-4">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to AI Apps
            </Button>
          </div>
          <div className="flex-1">
            <CalorieAITool />
          </div>
        </div>
      </div>
    );
  }

  if (appId === "skin-ai") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopMenu />
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-4">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to AI Apps
            </Button>
          </div>
          <div className="flex-1">
            <SkinAITool />
          </div>
        </div>
      </div>
    );
  }

  if (appId === "sleep-ai") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopMenu />
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-4">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to AI Apps
            </Button>
          </div>
          <div className="flex-1">
            <SleepAITool />
          </div>
        </div>
      </div>
    );
  }

  if (appId === "brain-ai") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopMenu />
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-4">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to AI Apps
            </Button>
          </div>
          <div className="flex-1">
            <BrainAITool />
          </div>
        </div>
      </div>
    );
  }

  if (appId === "notify-ai") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopMenu />
        <div className="flex-1 flex flex-col overflow-hidden">
          <NotifyAITool />
        </div>
      </div>
    );
  }

  if (appId === "financial-ai") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopMenu />
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-4">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to AI Apps
            </Button>
          </div>
          <div className="flex-1">
            <FinancialAITool />
          </div>
        </div>
      </div>
    );
  }

  if (appId === "fingerprint-ai") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopMenu />
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-4">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to AI Apps
            </Button>
          </div>
          <div className="flex-1">
            <FingerprintAITool />
          </div>
        </div>
      </div>
    );
  }

  // If appId is provided but no specific tool, redirect to main page
  if (appId) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopMenu />
        <main className="flex-1 pt-6 pb-12 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Coming Soon</h2>
            <p className="text-muted-foreground mb-6">
              This AI app is under development. Check back soon!
            </p>
            <Button onClick={handleBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to AI Apps
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopMenu />
      
      <main className="flex-1 pt-6 pb-12">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              AI-Powered Apps
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Discover Our AI Apps
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Explore our suite of AI-powered applications designed to enhance every aspect of your life
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all",
                  selectedCategory === category.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {category.label}
              </button>
            ))}
          </div>

          {/* Apps Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredApps.map((app) => (
              <div
                key={app.id}
                className={cn(
                  "group relative p-6 rounded-2xl border border-border/50 bg-card text-left transition-all duration-300",
                  app.comingSoon 
                    ? "opacity-70 cursor-not-allowed" 
                    : "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 cursor-pointer"
                )}
                onClick={() => !app.comingSoon && handleAppClick(app.id)}
              >
                {/* Badge */}
                <span
                  className={cn(
                    "absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded",
                    app.badge === "SOON" && "bg-muted text-muted-foreground",
                    app.badge === "NEW" && "bg-[#c8ff00] text-black",
                    app.badge === "POPULAR" && "bg-primary/20 text-primary",
                    app.badge === "BETA" && "bg-blue-500/20 text-blue-400"
                  )}
                >
                  {app.badge === "SOON" ? "COMING SOON" : app.badge}
                </span>

                {/* Icon */}
                <div
                  className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br",
                    app.gradient,
                    app.comingSoon && "grayscale opacity-60"
                  )}
                >
                  <app.icon className="h-7 w-7 text-foreground" />
                </div>

                {/* Content */}
                <h3 className={cn(
                  "text-lg font-semibold mb-2 transition-colors",
                  !app.comingSoon && "group-hover:text-primary"
                )}>
                  {app.name}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {app.description}
                </p>

                {/* Arrow or Coming Soon text */}
                {app.comingSoon ? (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>Coming Soon</span>
                  </div>
                ) : (
                  <div className="flex items-center text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="font-medium">Open App</span>
                    <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredApps.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">
                No apps found matching your search.
              </p>
            </div>
          )}
        </div>
      </main>

      
    </div>
  );
};

export default AIApps;
