import { useRef, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface FeaturedItem {
  id: string;
  title: string;
  description: string;
  tag: string;
  video_url: string;
  display_order: number;
  link_url: string | null;
}

interface FeaturedCardProps {
  item: FeaturedItem;
}

const FeaturedCard = ({ item }: FeaturedCardProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Autoplay when video is in viewport
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const CardContent = (
    <>
      {/* Video Preview Area */}
      <div className="relative h-48 bg-secondary overflow-hidden">
        {/* Video element - always visible and autoplaying */}
        <video
          ref={videoRef}
          src={item.video_url}
          muted
          loop
          playsInline
          preload="none"
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        <Badge 
          className="absolute top-4 left-4 z-10 bg-background/20 backdrop-blur-sm border-foreground/10 text-foreground"
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
    </>
  );

  if (item.link_url) {
    return (
      <Link 
        to={item.link_url}
        className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card hover:border-primary/30 transition-all duration-300 block"
      >
        {CardContent}
      </Link>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card hover:border-primary/30 transition-all duration-300">
      {CardContent}
    </div>
  );
};

const FeaturedSection = () => {
  const [featuredItems, setFeaturedItems] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedItems = async () => {
      const { data, error } = await supabase
        .from("featured_items")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (!error && data) {
        setFeaturedItems(data);
      }
      setLoading(false);
    };

    fetchFeaturedItems();
  }, []);

  if (loading) {
    return (
      <section className="py-12">
        <div className="container px-4">
          <div className="flex items-center gap-3 mb-8">
            <Star className="h-6 w-6 text-accent fill-accent" />
            <h2 className="text-2xl font-bold md:text-3xl">Top Choice</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-72 rounded-2xl bg-secondary animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12">
      <div className="container px-4">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-8">
          <Star className="h-6 w-6 text-accent fill-accent" />
          <h2 className="text-2xl font-bold md:text-3xl">Top Choice</h2>
        </div>

        {/* Featured Cards - 4 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredItems.map((item) => (
            <FeaturedCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedSection;
