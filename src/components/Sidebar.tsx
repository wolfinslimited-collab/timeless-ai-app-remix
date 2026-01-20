import { 
  Home, 
  Users, 
  Library, 
  User, 
  Settings,
  HelpCircle,
  Crown,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const NavItem = ({ icon, label, active, onClick }: NavItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all text-left",
      active 
        ? "bg-primary/10 text-primary" 
        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
    )}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const Sidebar = () => {
  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-border/50 bg-sidebar p-4">
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold">Higgsfield</span>
      </div>

      {/* Main Nav */}
      <nav className="space-y-1 flex-1">
        <NavItem icon={<Home className="h-5 w-5" />} label="Home" active />
        <NavItem icon={<Users className="h-5 w-5" />} label="Community" />
        <NavItem icon={<Library className="h-5 w-5" />} label="Library" />
        <NavItem icon={<User className="h-5 w-5" />} label="Profile" />
        
        <Separator className="my-4 bg-border/50" />
        
        <NavItem icon={<Settings className="h-5 w-5" />} label="Settings" />
        <NavItem icon={<HelpCircle className="h-5 w-5" />} label="Help & FAQ" />
      </nav>

      {/* Upgrade CTA */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Crown className="h-5 w-5 text-accent" />
          <span className="font-semibold">Go Pro</span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Unlock unlimited generations & premium models
        </p>
        <Button className="w-full gradient-primary text-primary-foreground">
          Upgrade Now
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
