import { Settings, Crown, Download, Heart, Share2, ChevronRight, LogOut, Image as ImageIcon, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import type { Screen } from "./MobileNav";

interface MobileProfileProps {
  onNavigate?: (screen: Screen) => void;
}

export function MobileProfile({ onNavigate }: MobileProfileProps) {
  const { user, signOut } = useAuth();
  const { credits, hasActiveSubscription } = useCredits();

  const displayName = user?.email?.split("@")[0] || "User";
  const initials = displayName.charAt(0).toUpperCase();

  const handleShareApp = async () => {
    const appStoreUrl = 'https://apps.apple.com/us/app/timeless-all-in-one-ai/id6740804440';
    const shareText = '🎨 Check out Timeless AI - Create amazing images, videos, and music with AI!\n\n';
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Timeless AI - All-in-One AI Creative Studio',
          text: shareText,
          url: appStoreUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${shareText}${appStoreUrl}`);
      }
    } catch (e) {
      console.error('Share failed:', e);
    }
  };

  const handleRateApp = () => {
    window.open('https://apps.apple.com/us/app/timeless-all-in-one-ai/id6740804440', '_blank');
  };

  return (
    <div className="px-4 py-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-foreground text-xl font-bold">Profile</h1>
        <button className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <Settings className="w-[18px] h-[18px] text-foreground" />
        </button>
      </div>

      {/* User Card */}
      <div className="bg-secondary rounded-2xl p-4 mb-4 border border-border">
        <div className="flex items-center gap-4">
          <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center">
            <span className="text-white text-[22px] font-bold">{initials}</span>
          </div>
          <div className="flex-1">
            <h2 className="text-foreground font-semibold text-base">{displayName}</h2>
            <p className="text-foreground text-[13px]">{user?.email}</p>
            {hasActiveSubscription && (
              <div className="flex items-center gap-1 mt-1.5">
                <Crown className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-yellow-400 text-xs font-medium">Pro Member</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Credits Card */}
      <div className="bg-gradient-to-r from-primary/50 to-pink-600/50 rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-xs">Available Credits</p>
            <p className="text-white text-[28px] font-bold">{credits ?? 0}</p>
          </div>
          <button 
            onClick={() => onNavigate?.("subscription")}
            className="px-4 py-2.5 bg-white rounded-full"
          >
            <span className="text-primary text-[13px] font-semibold">Add Credits</span>
          </button>
        </div>
      </div>

      {/* Menu Items */}
      <div className="space-y-2">
        <ProfileMenuItem 
          icon={Crown} 
          label="Subscription" 
          onClick={() => onNavigate?.("subscription")}
        />
        <ProfileMenuItem 
          icon={ImageIcon} 
          label="Library" 
          onClick={() => onNavigate?.("library")}
        />
        <ProfileMenuItem 
          icon={Download} 
          label="Downloads" 
          onClick={() => onNavigate?.("downloads")}
        />
        <ProfileMenuItem 
          icon={Heart} 
          label="Favorites" 
          onClick={() => onNavigate?.("favorites")}
        />
        <ProfileMenuItem 
          icon={Share2} 
          label="Share App" 
          onClick={handleShareApp}
        />
        <ProfileMenuItem 
          icon={Star} 
          label="Rate App" 
          onClick={handleRateApp}
        />
        
        {/* Sign Out Button */}
        <button
          onClick={signOut}
          className="w-full flex items-center gap-4 p-4 bg-destructive/10 rounded-xl hover:bg-destructive/20 transition-all"
        >
          <LogOut className="w-5 h-5 text-destructive" />
          <span className="text-destructive flex-1 text-left text-[15px]">Sign Out</span>
        </button>
      </div>
    </div>
  );
}

function ProfileMenuItem({ 
  icon: Icon, 
  label,
  onClick 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string;
  onClick?: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 bg-secondary rounded-xl hover:bg-secondary/80 transition-all border border-border"
    >
      <Icon className="w-5 h-5 text-muted-foreground" />
      <span className="text-foreground flex-1 text-left text-[15px]">{label}</span>
      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    </button>
  );
}
