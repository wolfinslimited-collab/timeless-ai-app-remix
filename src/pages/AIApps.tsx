import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TopMenu from "@/components/TopMenu";
// Footer removed from AI Apps pages
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import TranslateAITool from "@/components/tools/TranslateAITool";
import {
  Heart,
  Languages,
  Bell,
  Moon,
  Brain,
  Sparkles,
  DollarSign,
  Apple,
  Fingerprint,
  Clock,
  Megaphone,
  Search,
  ArrowRight,
  ArrowLeft,
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
  badge?: "NEW" | "POPULAR" | "BETA";
  gradient: string;
}

const aiApps: AIApp[] = [
  {
    id: "health-ai",
    name: "Health AI",
    description: "Personal health insights and recommendations powered by AI",
    icon: Heart,
    category: "health",
    badge: "POPULAR",
    gradient: "from-rose-500/20 to-pink-500/20",
  },
  {
    id: "translate-ai",
    name: "Translate AI",
    description: "Real-time translation across 100+ languages",
    icon: Languages,
    category: "productivity",
    badge: "NEW",
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  {
    id: "notify-ai",
    name: "Notify AI",
    description: "Smart notifications that learn your preferences",
    icon: Bell,
    category: "productivity",
    gradient: "from-amber-500/20 to-orange-500/20",
  },
  {
    id: "sleep-ai",
    name: "Sleep AI",
    description: "Optimize your sleep patterns with AI analysis",
    icon: Moon,
    category: "health",
    gradient: "from-indigo-500/20 to-purple-500/20",
  },
  {
    id: "brain-ai",
    name: "Brain AI",
    description: "Cognitive enhancement and memory training",
    icon: Brain,
    category: "productivity",
    badge: "POPULAR",
    gradient: "from-violet-500/20 to-purple-500/20",
  },
  {
    id: "skin-ai",
    name: "Skin AI",
    description: "AI-powered skin analysis and care recommendations",
    icon: Sparkles,
    category: "health",
    badge: "NEW",
    gradient: "from-pink-500/20 to-rose-500/20",
  },
  {
    id: "financial-ai",
    name: "Financial AI",
    description: "Smart financial planning and investment insights",
    icon: DollarSign,
    category: "finance",
    badge: "POPULAR",
    gradient: "from-emerald-500/20 to-green-500/20",
  },
  {
    id: "calorie-ai",
    name: "Calorie AI",
    description: "Track and optimize your nutrition with AI",
    icon: Apple,
    category: "health",
    gradient: "from-lime-500/20 to-green-500/20",
  },
  {
    id: "fingerprint-ai",
    name: "Fingerprint AI",
    description: "Advanced biometric security powered by AI",
    icon: Fingerprint,
    category: "security",
    badge: "BETA",
    gradient: "from-slate-500/20 to-zinc-500/20",
  },
  {
    id: "timefarm",
    name: "Timefarm",
    description: "AI-powered time management and productivity",
    icon: Clock,
    category: "productivity",
    gradient: "from-teal-500/20 to-cyan-500/20",
  },
  {
    id: "ads-ai",
    name: "Ads AI",
    description: "Create high-converting ad campaigns with AI",
    icon: Megaphone,
    category: "marketing",
    badge: "NEW",
    gradient: "from-orange-500/20 to-red-500/20",
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
  const [searchQuery, setSearchQuery] = useState("");

  const filteredApps = aiApps.filter((app) => {
    const matchesCategory = selectedCategory === "all" || app.category === selectedCategory;
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAppClick = (appId: string) => {
    navigate(`/ai-apps/${appId}`);
  };

  const handleBack = () => {
    navigate("/ai-apps");
  };

  // Render specific app tool if appId is provided
  if (appId === "translate-ai") {
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
            <TranslateAITool />
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

          {/* Search & Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
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
          </div>

          {/* Apps Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredApps.map((app) => (
              <button
                key={app.id}
                onClick={() => handleAppClick(app.id)}
                className={cn(
                  "group relative p-6 rounded-2xl border border-border/50 bg-card text-left transition-all duration-300",
                  "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
                )}
              >
                {/* Badge */}
                {app.badge && (
                  <span
                    className={cn(
                      "absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded",
                      app.badge === "NEW" && "bg-[#c8ff00] text-black",
                      app.badge === "POPULAR" && "bg-primary/20 text-primary",
                      app.badge === "BETA" && "bg-blue-500/20 text-blue-400"
                    )}
                  >
                    {app.badge}
                  </span>
                )}

                {/* Icon */}
                <div
                  className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br",
                    app.gradient
                  )}
                >
                  <app.icon className="h-7 w-7 text-foreground" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                  {app.name}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {app.description}
                </p>

                {/* Arrow */}
                <div className="flex items-center text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="font-medium">Open App</span>
                  <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
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
