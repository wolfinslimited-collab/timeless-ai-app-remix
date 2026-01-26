import { Search, Bell, Crown, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo-small.png";
const Header = () => {
  const { user } = useAuth();
  const { credits, loading: creditsLoading, hasActiveSubscription } = useCredits();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src={logo} alt="Timeless logo" className="h-9 w-9 object-contain" />
          <span className="text-xl font-bold">Timeless</span>
        </div>

        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search tools, effects, models..." 
              className="pl-10 bg-secondary border-border/50 focus:border-primary"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary/50 px-3 py-1.5">
              <Coins className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">
                {creditsLoading ? "..." : hasActiveSubscription ? `Pro · ${credits ?? 0}` : credits ?? 0}
              </span>
            </div>
          )}

          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Bell className="h-5 w-5" />
          </Button>
          
          {hasActiveSubscription && (
            <Button 
              className="gradient-primary text-primary-foreground gap-2 hidden sm:flex"
              onClick={() => navigate("/credits")}
            >
              <Crown className="h-4 w-4" />
              Get Credits
            </Button>
          )}

          <Avatar className="h-9 w-9 border-2 border-primary/50">
            <AvatarImage src="" />
            <AvatarFallback className="bg-secondary text-foreground text-sm">
              {user ? user.email?.charAt(0).toUpperCase() : "U"}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
};

export default Header;
