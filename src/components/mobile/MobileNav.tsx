import { Home, Sparkles, Grid2X2, Mic, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type Screen = 
  | "home" 
  | "create" 
  | "chat" 
  | "library" 
  | "profile" 
  | "image" 
  | "video" 
  | "cinema" 
  | "audio"
  | "visual-styles"
  | "apps"
  | "auth" 
  | "subscription"
  | "downloads"
  | "favorites"
  | "notify-ai"
  | "sleep-ai"
  | "brain-ai"
  | "skin-ai"
  | "financial-ai"
  | "calorie-ai"
  | "fingerprint-ai"
  | "agents";

interface MobileNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export function MobileNav({ currentScreen, onNavigate }: MobileNavProps) {
  const isCreateActive = ["create", "image", "video", "cinema", "audio", "visual-styles"].includes(currentScreen);
  const isProfileActive = ["profile", "library", "subscription", "downloads", "favorites"].includes(currentScreen);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-20 bg-background border-t border-border">
      <div className="flex items-center justify-around h-full px-2 pb-4">
        <NavItem 
          icon={Home} 
          label="Home" 
          active={currentScreen === "home"}
          onClick={() => onNavigate("home")}
        />
        <NavItem 
          icon={Sparkles} 
          label="AI Studio" 
          active={isCreateActive}
          onClick={() => onNavigate("create")}
        />

        {/* Center Timeless Logo Button */}
        <button
          onClick={() => onNavigate("agents")}
          className={cn(
            "flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all -mt-5"
          )}
        >
          <div className={cn(
            "h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg transition-all",
            currentScreen === "agents"
              ? "bg-gradient-to-br from-primary to-accent shadow-primary/30"
              : "bg-gradient-to-br from-primary/80 to-accent/60 shadow-primary/20"
          )}>
            <span className="text-lg font-black text-primary-foreground tracking-tighter" style={{ fontFamily: "system-ui" }}>T</span>
          </div>
          <span className={cn(
            "text-[9px] font-semibold",
            currentScreen === "agents" ? "text-primary" : "text-muted-foreground"
          )}>Timeless</span>
        </button>

        <NavItem 
          icon={Grid2X2} 
          label="Apps" 
          active={currentScreen === "apps"}
          onClick={() => onNavigate("apps")}
        />
        <NavItem 
          icon={User} 
          label="Profile" 
          active={isProfileActive}
          onClick={() => onNavigate("profile")}
        />
      </div>
    </div>
  );
}

function NavItem({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
