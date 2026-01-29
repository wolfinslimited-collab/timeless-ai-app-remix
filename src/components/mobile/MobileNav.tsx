import { Home, Sparkles, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type Screen = "home" | "create" | "chat" | "library" | "profile" | "image" | "video" | "cinema" | "auth" | "subscription";

interface MobileNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export function MobileNav({ currentScreen, onNavigate }: MobileNavProps) {
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
          active={currentScreen === "create" || currentScreen === "image" || currentScreen === "video"}
          onClick={() => onNavigate("create")}
        />
        <NavItem 
          icon={MessageSquare} 
          label="Chat" 
          active={currentScreen === "chat"}
          onClick={() => onNavigate("chat")}
        />
        <NavItem 
          icon={User} 
          label="Profile" 
          active={currentScreen === "profile" || currentScreen === "library"}
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
        "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
