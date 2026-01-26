import { useState, useMemo } from "react";
import { 
  Search, 
  Bell, 
  Crown, 
  Coins, 
  Menu, 
  Sparkles, 
  Plus,
  Home,
  Users,
  Library,
  GraduationCap,
  User,
  Settings,
  HelpCircle,
  LogOut,
  LogIn,
  CreditCard,
  Image,
  Video,
  Mic,
  Wand2,
  MessageSquare,
  X,
  Gift
} from "lucide-react";
import logo from "@/assets/logo-small.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Shield } from "lucide-react";


// Searchable items data
const searchableItems = [
  { title: "Create Image", description: "Generate AI images with any style", icon: <Image className="h-5 w-5 text-emerald-400" />, gradient: "bg-emerald-500/20", action: "/create?type=image", type: "tool" },
  { title: "Create Video", description: "Generate AI videos from text or images", icon: <Video className="h-5 w-5 text-blue-400" />, gradient: "bg-blue-500/20", action: "/create?type=video", type: "tool" },
  { title: "Create Music", description: "Generate AI music and audio tracks", icon: <Mic className="h-5 w-5 text-orange-400" />, gradient: "bg-orange-500/20", action: "/create?type=music", type: "tool" },
  { title: "Cinema Studio", description: "Professional cinematic video creation", icon: <Wand2 className="h-5 w-5 text-purple-400" />, gradient: "bg-purple-500/20", action: "/create?type=cinema", type: "tool" },
  { title: "AI Chat", description: "Chat with powerful AI models", icon: <MessageSquare className="h-5 w-5 text-amber-400" />, gradient: "bg-amber-500/20", action: "/create?type=chat", type: "tool" },
  { title: "Upscale", description: "Enhance media quality to 4K", icon: <Image className="h-5 w-5 text-indigo-400" />, gradient: "bg-indigo-500/20", action: "/create?type=image&app=upscale", type: "tool" },
  { title: "Inpainting", description: "Brush areas to edit images with AI", icon: <Image className="h-5 w-5 text-pink-400" />, gradient: "bg-pink-500/20", action: "/create?type=image&app=inpainting", type: "tool" },
  { title: "Lipsync Studio", description: "Create talking clips with AI", icon: <Mic className="h-5 w-5 text-rose-400" />, gradient: "bg-rose-500/20", action: "/create?type=video&app=lipsync", type: "tool" },
  { title: "Grok 3", description: "xAI's most capable model", icon: <Sparkles className="h-5 w-5 text-blue-400" />, gradient: "bg-blue-500/20", action: "/create?type=chat", type: "model" },
  { title: "ChatGPT 5.2", description: "OpenAI's latest reasoning", icon: <Sparkles className="h-5 w-5 text-green-400" />, gradient: "bg-green-500/20", action: "/create?type=chat", type: "model" },
  { title: "Gemini 3 Pro", description: "Google's next-gen AI", icon: <Sparkles className="h-5 w-5 text-yellow-400" />, gradient: "bg-yellow-500/20", action: "/create?type=chat", type: "model" },
  { title: "DeepSeek R1", description: "Deep reasoning model", icon: <Sparkles className="h-5 w-5 text-cyan-400" />, gradient: "bg-cyan-500/20", action: "/create?type=chat", type: "model" },
  { title: "Llama 3.3", description: "Meta's open AI model", icon: <Sparkles className="h-5 w-5 text-violet-400" />, gradient: "bg-violet-500/20", action: "/create?type=chat", type: "model" },
];

const TopMenu = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminAuth();
  const { credits, loading: creditsLoading, hasActiveSubscription } = useCredits();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return searchableItems.filter(
      item => 
        item.title.toLowerCase().includes(query) || 
        item.description.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const navItems = [
    { label: "Chat", path: "/create?type=chat" },
    { label: "Image", path: "/create?type=image" },
    { label: "Video", path: "/create?type=video" },
    { label: "Music", path: "/create?type=music" },
    { label: "Cinema Studio", path: "/create?type=cinema" },
    { label: "AI Apps", path: "/ai-apps" },
  ];

  const isActive = (path: string) => {
    const currentUrl = location.pathname + location.search;
    return currentUrl === path || currentUrl.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left: Logo & Nav */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <button 
            onClick={() => navigate("/")}
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <img src={logo} alt="Timeless" className="h-9 w-9 object-contain" />
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.path)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

{/* Center: Search (Desktop) */}
        <div className="hidden lg:flex flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search tools, models..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchOpen(true)}
              className="pl-10 pr-8 bg-secondary border-border/50 focus:border-primary"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setIsSearchOpen(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            
            {/* Search Results Dropdown */}
            {isSearchOpen && searchQuery && filteredResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
                <div className="max-h-80 overflow-y-auto">
                  {filteredResults.map((item, index) => (
                    <button
                      key={`${item.type}-${index}`}
                      onClick={() => {
                        navigate(item.action);
                        setSearchQuery("");
                        setIsSearchOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
                    >
                      <div className={cn("p-2 rounded-lg", item.gradient)}>
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                      </div>
                      <span className="text-xs text-muted-foreground capitalize bg-secondary px-2 py-0.5 rounded">
                        {item.type}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {isSearchOpen && searchQuery && filteredResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg p-4 text-center z-50">
                <p className="text-sm text-muted-foreground">No results found for "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Create Button (Mobile) */}
          <Button 
            size="sm"
            className="md:hidden gradient-primary text-primary-foreground"
            onClick={() => navigate("/create")}
          >
            <Plus className="h-4 w-4" />
          </Button>

          {/* Credits */}
          {user && (
            <button
              onClick={() => navigate("/pricing")}
              className="flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary/50 px-3 py-1.5 hover:bg-secondary transition-colors"
            >
              <Coins className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">
                {creditsLoading ? "..." : hasActiveSubscription ? (
                  <>Pro · {credits ?? 0}</>
                ) : (
                  credits ?? 0
                )}
              </span>
            </button>
          )}

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hidden sm:flex">
            <Bell className="h-5 w-5" />
          </Button>
          
          {/* Buy Credits Button - only show for subscribed users */}
          {user && hasActiveSubscription && (
            <Button 
              className="gradient-primary text-primary-foreground gap-2 hidden md:flex"
              onClick={() => navigate("/credits")}
            >
              <Plus className="h-4 w-4" />
              Buy Credits
            </Button>
          )}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2">
                <Avatar className="h-9 w-9 border-2 border-primary/50 cursor-pointer hover:border-primary transition-colors">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-secondary text-foreground text-sm">
                    {user ? user.email?.charAt(0).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-popover border-border">
              {user ? (
                <>
                  <div className="px-3 py-3">
                    <p className="text-sm font-medium">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {hasActiveSubscription ? "Pro Member" : "Free Plan"}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Navigate</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => navigate("/")}>
                    <Home className="h-4 w-4 mr-2" />
                    Home
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/library")}>
                    <Library className="h-4 w-4 mr-2" />
                    My Library
                  </DropdownMenuItem>
                  
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Admin</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => navigate("/admin")}>
                        <Shield className="h-4 w-4 mr-2" />
                        Admin Panel
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Account</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/subscription")}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Subscription
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/support")}>
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Support
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/referrals")}>
                    <Gift className="h-4 w-4 mr-2" />
                    Referrals
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="https://learn.timelessapp.ai" target="_blank" rel="noopener noreferrer" className="flex items-center">
                      <GraduationCap className="h-4 w-4 mr-2" />
                      Learn
                    </a>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => navigate("/auth")}>
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/auth")}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create Account
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-popover border-border">
              {navItems.map((item) => (
                <DropdownMenuItem 
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={isActive(item.path) ? "bg-primary/10 text-primary" : ""}
                >
                  {item.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {user && (
                <div className="px-2 py-2">
                  <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-accent" />
                      <span className="text-sm text-muted-foreground">Balance</span>
                    </div>
                    <span className="text-sm font-semibold">
                      {creditsLoading ? "..." : hasActiveSubscription ? `Pro · ${credits ?? 0}` : credits ?? 0}
                    </span>
                  </div>
                </div>
              )}
              {user && hasActiveSubscription && (
                <DropdownMenuItem 
                  onClick={() => navigate("/credits")}
                  className="text-primary font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Buy Credits
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default TopMenu;
