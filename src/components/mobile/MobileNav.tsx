import { Home, Sparkles, Grid2X2, MessageSquare, User } from "lucide-react";
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
  | "apps"
  | "auth" 
  | "subscription"
  | "downloads"
  | "favorites"
  | "trend"
  | "notify-ai"
  | "sleep-ai"
  | "brain-ai"
  | "skin-ai"
  | "financial-ai"
  | "calorie-ai"
  | "fingerprint-ai";

interface MobileNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export function MobileNav({ currentScreen, onNavigate }: MobileNavProps) {
  const isCreateActive = ["create", "image", "video", "cinema", "audio"].includes(currentScreen);
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
          label="Create" 
          active={isCreateActive}
          onClick={() => onNavigate("create")}
        />
        <NavItem 
          icon={MessageSquare} 
          label="Chat" 
          active={currentScreen === "chat"}
          onClick={() => onNavigate("chat")}
        />
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
