import { useState } from "react";
import { Crown, Download, Heart, Share2, ChevronRight, LogOut, Image as ImageIcon, Star, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import type { Screen } from "./MobileNav";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MobileProfileProps {
  onNavigate?: (screen: Screen) => void;
}

export function MobileProfile({ onNavigate }: MobileProfileProps) {
  const { user, signOut } = useAuth();
  const { credits, hasActiveSubscription } = useCredits();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState<string | null>(null);
  const [otherReason, setOtherReason] = useState("");

  const deleteReasons = [
    "I no longer need the app",
    "I found a better alternative",
    "Too expensive",
    "Privacy concerns",
    "Too many bugs or issues",
    "Other",
  ];

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
    const hasRated = localStorage.getItem('hasRatedApp');
    if (hasRated) return;
    localStorage.setItem('hasRatedApp', 'true');
    window.open('https://apps.apple.com/us/app/timeless-all-in-one-ai/id6740804440', '_blank');
  };

  return (
    <div className="px-4 py-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-foreground text-xl font-bold">Profile</h1>
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
          onClick={() => setShowSignOutDialog(true)}
          className="w-full flex items-center gap-4 p-4 bg-destructive/10 rounded-xl hover:bg-destructive/20 transition-all"
        >
          <LogOut className="w-5 h-5 text-destructive" />
          <span className="text-destructive flex-1 text-left text-[15px]">Sign Out</span>
        </button>
        
        {/* Delete Account Button - acts like sign out */}
        <button
          onClick={() => setShowDeleteDialog(true)}
          className="w-full flex items-center gap-4 p-4 bg-destructive/10 rounded-xl hover:bg-destructive/20 transition-all"
        >
          <Trash2 className="w-5 h-5 text-destructive" />
          <span className="text-destructive flex-1 text-left text-[15px]">Delete Account</span>
        </button>
      </div>

      {/* Delete Account - Reason Selection Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open);
        if (!open) { setDeleteReason(null); setOtherReason(""); }
      }}>
        <AlertDialogContent className="bg-background border-border max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Why are you leaving?</AlertDialogTitle>
            <AlertDialogDescription>
              Please let us know why you'd like to delete your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 my-2">
            {deleteReasons.map((reason) => (
              <button
                key={reason}
                onClick={() => setDeleteReason(reason)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                  deleteReason === reason
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}
              >
                {reason}
              </button>
            ))}
            {deleteReason === "Other" && (
              <textarea
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Tell us more..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 text-foreground text-sm resize-none h-20 focus:outline-none focus:border-primary"
              />
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await signOut();
                window.location.href = "/auth";
              }}
              disabled={!deleteReason || (deleteReason === "Other" && !otherReason.trim())}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={signOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
