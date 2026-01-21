import { 
  Image, 
  Video, 
  Wand2, 
  Brush, 
  Sparkles, 
  Scissors, 
  ArrowUpCircle, 
  Mic,
  User,
  ChevronRight
} from "lucide-react";
import ToolCard from "./ToolCard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const tools = [
  {
    title: "Create Image",
    description: "Generate AI images with any style",
    icon: <Image className="h-6 w-6 text-emerald-400" />,
    badge: "top" as const,
    gradient: "bg-emerald-500/20",
    action: "image",
  },
  {
    title: "Create Video",
    description: "Generate AI videos from text or images",
    icon: <Video className="h-6 w-6 text-blue-400" />,
    badge: "top" as const,
    gradient: "bg-blue-500/20",
    action: "video",
  },
  {
    title: "Create Music",
    description: "Generate AI music and audio tracks",
    icon: <Mic className="h-6 w-6 text-orange-400" />,
    badge: "new" as const,
    gradient: "bg-orange-500/20",
    action: "music",
  },
  {
    title: "Motion Control",
    description: "Precise control of character actions up to 30 seconds",
    icon: <Wand2 className="h-6 w-6 text-purple-400" />,
    badge: "new" as const,
    gradient: "bg-purple-500/20",
  },
  {
    title: "Edit Image",
    description: "Brush areas to edit images with AI",
    icon: <Brush className="h-6 w-6 text-pink-400" />,
    gradient: "bg-pink-500/20",
  },
  {
    title: "Nano Banana Pro",
    description: "Best 4K image model ever",
    icon: <Sparkles className="h-6 w-6 text-amber-400" />,
    badge: "unlimited" as const,
    gradient: "bg-amber-500/20",
    action: "image",
  },
  {
    title: "Kling Video Edit",
    description: "Advanced video editing with AI",
    icon: <Scissors className="h-6 w-6 text-cyan-400" />,
    badge: "pro" as const,
    gradient: "bg-cyan-500/20",
  },
  {
    title: "Upscale",
    description: "Enhance media quality to 4K",
    icon: <ArrowUpCircle className="h-6 w-6 text-indigo-400" />,
    gradient: "bg-indigo-500/20",
  },
  {
    title: "Lipsync Studio",
    description: "Create talking clips with AI",
    icon: <Mic className="h-6 w-6 text-rose-400" />,
    gradient: "bg-rose-500/20",
  },
  {
    title: "Soul ID",
    description: "Create unique AI characters",
    icon: <User className="h-6 w-6 text-teal-400" />,
    badge: "new" as const,
    gradient: "bg-teal-500/20",
  },
];

const ToolsGrid = () => {
  const navigate = useNavigate();

  const handleToolClick = (action?: string) => {
    if (action) {
      navigate(`/create?type=${action}`);
    }
  };

  return (
    <section className="py-12">
      <div className="container px-4">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">Quick Actions</h2>
            <p className="text-muted-foreground mt-1">Your most-used creative tools</p>
          </div>
          <Button 
            variant="ghost" 
            className="text-muted-foreground hover:text-foreground gap-1"
            onClick={() => navigate("/create")}
          >
            See all
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tools.map((tool) => (
            <ToolCard 
              key={tool.title} 
              {...tool} 
              onClick={() => handleToolClick(tool.action)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ToolsGrid;
