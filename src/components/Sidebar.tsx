import { useState } from "react";
import { 
  Home, 
  Users, 
  Library, 
  User, 
  Settings,
  HelpCircle,
  Crown,
  Sparkles,
  LogOut,
  LogIn,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}

const NavItem = ({ icon, label, active, onClick, collapsed }: NavItemProps) => {
  const content = (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all text-left",
        collapsed && "justify-center",
        active 
          ? "bg-primary/10 text-primary" 
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
      )}
    >
      {icon}
      {!collapsed && <span className="font-medium">{label}</span>}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return content;
};

const Sidebar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      "hidden md:flex flex-col h-screen sticky top-0 border-r border-border/50 bg-sidebar p-4 transition-all duration-300",
      collapsed ? "w-[72px]" : "w-64"
    )}>
      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute -right-3 top-6 h-6 w-6 rounded-full border border-border bg-background shadow-sm hover:bg-secondary",
          "z-10"
        )}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>

      {/* Main Nav */}
      <nav className="space-y-1 flex-1 mt-8">
        <NavItem 
          icon={<Home className="h-5 w-5" />} 
          label="Home" 
          active={location.pathname === "/"} 
          onClick={() => navigate("/")}
          collapsed={collapsed}
        />
        <NavItem 
          icon={<Users className="h-5 w-5" />} 
          label="Community"
          collapsed={collapsed}
        />
        <NavItem 
          icon={<Library className="h-5 w-5" />} 
          label="Library" 
          active={location.pathname === "/library"}
          onClick={() => navigate("/library")}
          collapsed={collapsed}
        />
        <NavItem 
          icon={<User className="h-5 w-5" />} 
          label="Profile"
          collapsed={collapsed}
        />
        
        <Separator className="my-4 bg-border/50" />
        
        <NavItem 
          icon={<Settings className="h-5 w-5" />} 
          label="Settings"
          collapsed={collapsed}
        />
        <NavItem 
          icon={<HelpCircle className="h-5 w-5" />} 
          label="Help & FAQ"
          collapsed={collapsed}
        />
        
        {user ? (
          <NavItem 
            icon={<LogOut className="h-5 w-5" />} 
            label="Sign Out" 
            onClick={signOut}
            collapsed={collapsed}
          />
        ) : (
          <NavItem 
            icon={<LogIn className="h-5 w-5" />} 
            label="Sign In" 
            onClick={() => navigate("/auth")}
            collapsed={collapsed}
          />
        )}
      </nav>

      {/* Upgrade CTA - only show when expanded */}
      {!collapsed && (
        user ? (
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-5 w-5 text-accent" />
              <span className="font-semibold">Need More Credits?</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Get more credits for AI generations
            </p>
            <Button 
              className="w-full gradient-primary text-primary-foreground"
              onClick={() => navigate("/pricing")}
            >
              Get Credits
            </Button>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold">Get Started</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Sign up to save your creations
            </p>
            <Button 
              className="w-full gradient-primary text-primary-foreground"
              onClick={() => navigate("/auth")}
            >
              Sign Up Free
            </Button>
          </div>
        )
      )}

      {/* Collapsed CTA icon */}
      {collapsed && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="mx-auto"
              onClick={() => user ? navigate("/pricing") : navigate("/auth")}
            >
              {user ? <Crown className="h-5 w-5 text-accent" /> : <Sparkles className="h-5 w-5 text-primary" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {user ? "Get Credits" : "Sign Up Free"}
          </TooltipContent>
        </Tooltip>
      )}
    </aside>
  );
};

export default Sidebar;
