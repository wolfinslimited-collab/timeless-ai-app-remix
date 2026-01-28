import { Settings, Crown, Download, Heart, Share2, ChevronRight, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import type { Screen } from "./MobileNav";

interface MobileProfileProps {
  onNavigate?: (screen: Screen) => void;
}

export function MobileProfile({ onNavigate }: MobileProfileProps) {
  const { user, signOut } = useAuth();
  const { credits, subscriptionStatus, hasActiveSubscription } = useCredits();

  const displayName = user?.email?.split("@")[0] || "User";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="px-4 py-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white text-xl font-bold">Profile</h1>
        <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <Settings className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* User Card */}
      <div className="bg-white/5 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-white text-xl font-bold">{initials}</span>
          </div>
          <div className="flex-1">
            <h2 className="text-white font-semibold">{displayName}</h2>
            <p className="text-gray-400 text-sm">{user?.email}</p>
            {hasActiveSubscription && (
              <div className="flex items-center gap-2 mt-1">
                <Crown className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-yellow-400 text-xs font-medium">Pro Member</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Credits */}
      <div className="bg-gradient-to-r from-purple-600/50 to-pink-600/50 rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-300 text-xs">Available Credits</p>
            <p className="text-white text-2xl font-bold">{credits ?? 0}</p>
          </div>
          <button 
            onClick={() => onNavigate?.("subscription")}
            className="px-4 py-2 bg-white rounded-full"
          >
            <span className="text-purple-600 text-sm font-semibold">Add Credits</span>
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
        <ProfileMenuItem icon={Download} label="Downloads" />
        <ProfileMenuItem icon={Heart} label="Favorites" />
        <ProfileMenuItem icon={Share2} label="Share App" />
        <button
          onClick={signOut}
          className="w-full flex items-center gap-4 p-4 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-all"
        >
          <LogOut className="w-5 h-5 text-red-400" />
          <span className="text-red-400 flex-1 text-left">Sign Out</span>
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
      className="w-full flex items-center gap-4 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
    >
      <Icon className="w-5 h-5 text-gray-400" />
      <span className="text-white flex-1 text-left">{label}</span>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </button>
  );
}
