import { Sparkles, ArrowRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden py-12 md:py-20">
      {/* Background effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/20 blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-accent/10 blur-[128px]" />
      </div>

      <div className="container px-4">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">All-in-one-AI</span>
          </div>

          {/* Heading */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
            What will you
            <br />
            <span className="text-gradient">create today?</span>
          </h1>

          {/* Description */}
          <p className="mb-8 text-lg text-muted-foreground md:text-xl">
            Create authentic images and videos with natural texture and easy style.
            Powered by the most advanced AI models.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <>
                <Button 
                  size="lg" 
                  className="gradient-primary text-primary-foreground gap-2 px-8"
                  onClick={() => navigate("/create")}
                >
                  Start Creating
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="gap-2 border-border/50 hover:bg-secondary"
                  onClick={() => navigate("/library")}
                >
                  View Library
                </Button>
              </>
            ) : (
              <>
                <Button 
                  size="lg" 
                  className="gradient-primary text-primary-foreground gap-2 px-8"
                  onClick={() => navigate("/create")}
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="gap-2 border-border/50 hover:bg-secondary"
                  onClick={() => navigate("/auth")}
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
