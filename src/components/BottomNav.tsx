import { Home, Users, Library, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";

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
      "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all",
      active 
        ? "text-primary" 
        : "text-muted-foreground hover:text-foreground"
    )}
  >
    <div className={cn(
      "p-2 rounded-xl transition-all",
      active && "bg-primary/20"
    )}>
      {icon}
    </div>
    <span className="text-xs font-medium">{label}</span>
  </button>
);

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/90 backdrop-blur-xl md:hidden">
      <div className="flex items-center justify-around py-2">
        <NavItem 
          icon={<Home className="h-5 w-5" />} 
          label="Home" 
          active={location.pathname === "/"}
          onClick={() => navigate("/")}
        />
        <NavItem 
          icon={<Users className="h-5 w-5" />} 
          label="Community" 
        />
        <NavItem 
          icon={<Library className="h-5 w-5" />} 
          label="Library" 
          active={location.pathname === "/library"}
          onClick={() => navigate("/library")}
        />
        <NavItem 
          icon={<User className="h-5 w-5" />} 
          label="Profile" 
          active={location.pathname === "/auth"}
          onClick={() => navigate("/auth")}
        />
      </div>
    </nav>
  );
};

export default BottomNav;
