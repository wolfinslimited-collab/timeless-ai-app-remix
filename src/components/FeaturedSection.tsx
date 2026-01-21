import { Play, Star, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const featuredItems = [
  {
    title: "Cinema Studio v1.5",
    description: "Aperture control, project organization, all aspect ratios",
    tag: "Featured",
    gradient: "from-violet-600 to-purple-600",
  },
  {
    title: "Timeless Canvas",
    description: "Full control over image editing with AI",
    tag: "New",
    gradient: "from-blue-600 to-cyan-600",
  },
  {
    title: "Mixed Media Studio",
    description: "AI-powered mixed-media effects for your videos",
    tag: "Popular",
    gradient: "from-pink-600 to-rose-600",
  },
];

const FeaturedSection = () => {
  return (
    <section className="py-12">
      <div className="container px-4">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Star className="h-6 w-6 text-accent fill-accent" />
            <h2 className="text-2xl font-bold md:text-3xl">Top Choice</h2>
          </div>
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground gap-1">
            See all
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Featured Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredItems.map((item) => (
            <div
              key={item.title}
              className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card hover:border-primary/30 transition-all duration-300"
            >
              {/* Video Preview Area */}
              <div className={`relative h-48 bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
                <button className="flex h-14 w-14 items-center justify-center rounded-full bg-background/20 backdrop-blur-sm border border-foreground/10 group-hover:scale-110 transition-transform">
                  <Play className="h-6 w-6 text-foreground fill-foreground ml-1" />
                </button>
                <Badge 
                  className="absolute top-4 left-4 bg-background/20 backdrop-blur-sm border-foreground/10 text-foreground"
                >
                  {item.tag}
                </Badge>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedSection;
