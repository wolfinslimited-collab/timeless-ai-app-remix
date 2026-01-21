import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import TopMenu from "@/components/TopMenu";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Image, Video, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import GenerationCard from "@/components/GenerationCard";

interface Generation {
  id: string;
  title: string | null;
  prompt: string;
  type: string;
  model: string;
  status: string;
  output_url: string | null;
  thumbnail_url: string | null;
  credits_used: number;
  created_at: string;
}

const Library = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "image" | "video">("all");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchGenerations();
    }
  }, [user]);

  const fetchGenerations = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("generations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error loading library",
        description: error.message,
      });
    } else {
      setGenerations(data || []);
    }
    setIsLoading(false);
  };

  const deleteGeneration = async (id: string) => {
    const { error } = await supabase
      .from("generations")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error deleting",
        description: error.message,
      });
    } else {
      setGenerations(generations.filter((g) => g.id !== id));
      toast({
        title: "Deleted",
        description: "Generation removed from library.",
      });
    }
  };

  const filteredGenerations = generations.filter((g) => {
    if (filter === "all") return true;
    return g.type === filter;
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopMenu />

      <div className="flex">
        <Sidebar />

        <main className="flex-1 pb-20 md:pb-0">
          <div className="max-w-7xl mx-auto p-6">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Your Library</h1>
              <p className="text-muted-foreground">
                All your AI-generated creations in one place
              </p>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
                className={filter === "all" ? "gradient-primary text-primary-foreground" : "border-border/50"}
              >
                All
              </Button>
              <Button
                variant={filter === "image" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("image")}
                className={filter === "image" ? "gradient-primary text-primary-foreground" : "border-border/50"}
              >
                <Image className="h-4 w-4 mr-1" />
                Images
              </Button>
              <Button
                variant={filter === "video" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("video")}
                className={filter === "video" ? "gradient-primary text-primary-foreground" : "border-border/50"}
              >
                <Video className="h-4 w-4 mr-1" />
                Videos
              </Button>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredGenerations.length === 0 ? (
              <div className="text-center py-20">
                <div className="mx-auto w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Image className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No creations yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start creating amazing AI content
                </p>
                <Button 
                  onClick={() => navigate("/")}
                  className="gradient-primary text-primary-foreground"
                >
                  Start Creating
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredGenerations.map((gen) => (
                  <GenerationCard 
                    key={gen.id} 
                    gen={gen} 
                    onDelete={deleteGeneration} 
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
};

export default Library;
