import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import TopMenu from "@/components/TopMenu";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Mail,
  Coins,
  Crown,
  Calendar,
  Save,
  Loader2,
  ImageIcon,
  CreditCard,
  Shield,
  LogOut,
  ChevronRight,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
} from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { credits, hasActiveSubscription, subscriptionStatus } = useCredits();
  const { toast } = useToast();
  
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [totalGenerations, setTotalGenerations] = useState(0);
  
  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        // Fetch profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, created_at")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (profileError) throw profileError;
        
        if (profile) {
          setDisplayName(profile.display_name || "");
          setAvatarUrl(profile.avatar_url);
          setMemberSince(profile.created_at);
        }

        // Fetch generation count
        const { count, error: countError } = await supabase
          .from("generations")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);
        
        if (!countError && count !== null) {
          setTotalGenerations(count);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName })
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save profile. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/avatar.${fileExt}`;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload an image file.",
      });
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
      });
      return;
    }
    
    setIsUploadingAvatar(true);
    try {
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      // Add cache-busting query param
      const newAvatarUrl = `${publicUrl}?t=${Date.now()}`;
      
      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('user_id', user.id);
      
      if (updateError) throw updateError;
      
      setAvatarUrl(newAvatarUrl);
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated.",
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload avatar. Please try again.",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleChangePassword = async () => {
    // Validate passwords
    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 6 characters.",
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
      });
      return;
    }
    
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
      
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
      
      // Clear form
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordSection(false);
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast({
        variant: "destructive",
        title: "Password change failed",
        description: error.message || "Failed to change password. Please try again.",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <TopMenu />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24 md:pb-10">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6">
          {/* Profile Card */}
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Profile Information</CardTitle>
              <CardDescription>Update your profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar & Name Section */}
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start">
                <div className="relative group">
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-primary/20">
                    <AvatarImage src={avatarUrl || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                      {displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    {isUploadingAvatar ? (
                      <Loader2 className="h-6 w-6 text-foreground animate-spin" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-foreground" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={isUploadingAvatar}
                    />
                  </label>
                </div>
                
                <div className="flex-1 space-y-4 w-full text-center sm:text-left">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      placeholder="Enter your display name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Email</Label>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{user.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Save Button */}
              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={isSaving} className="gap-2">
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <Coins className="h-5 w-5 mx-auto mb-2 text-accent" />
                <p className="text-2xl font-bold">{credits ?? 0}</p>
                <p className="text-xs text-muted-foreground">Credits</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <ImageIcon className="h-5 w-5 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{totalGenerations}</p>
                <p className="text-xs text-muted-foreground">Generations</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <Crown className="h-5 w-5 mx-auto mb-2 text-accent" />
                <p className="text-lg font-bold">
                  {hasActiveSubscription ? "Pro" : "Free"}
                </p>
                <p className="text-xs text-muted-foreground">Plan</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <Calendar className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {memberSince ? new Date(memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">Member Since</p>
              </CardContent>
            </Card>
          </div>

          {/* Subscription Card */}
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Subscription</CardTitle>
                  <CardDescription>Manage your plan and billing</CardDescription>
                </div>
                {hasActiveSubscription && (
                  <Badge className="bg-accent text-accent-foreground">Active</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${hasActiveSubscription ? 'bg-accent/20' : 'bg-secondary'}`}>
                    <Crown className={`h-6 w-6 ${hasActiveSubscription ? 'text-accent' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="font-medium">
                      {hasActiveSubscription ? "Pro Plan" : "Free Plan"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {hasActiveSubscription 
                        ? "Unlimited generations & premium features" 
                        : "Limited credits, upgrade for more"}
                    </p>
                  </div>
                </div>
                <Button 
                  variant={hasActiveSubscription ? "outline" : "default"}
                  onClick={() => navigate("/subscription")}
                  className="w-full sm:w-auto gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  {hasActiveSubscription ? "Manage Plan" : "Upgrade to Pro"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings Card */}
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Security</CardTitle>
                  <CardDescription>Manage your password and security settings</CardDescription>
                </div>
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <button
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">Change Password</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showPasswordSection ? 'rotate-180' : ''}`} />
                </button>
                
                {showPasswordSection && (
                  <div className="space-y-4 px-3 pb-2 animate-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="max-w-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="max-w-sm"
                      />
                    </div>
                    <Button 
                      onClick={handleChangePassword} 
                      disabled={isChangingPassword || !newPassword || !confirmPassword}
                      className="gap-2"
                    >
                      {isChangingPassword ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                      Update Password
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-1">
                <button
                  onClick={() => navigate("/pricing")}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Coins className="h-5 w-5 text-accent" />
                    <span className="text-sm font-medium">Buy Credits</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => navigate("/library")}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">My Library</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
                <Separator className="my-2" />
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-destructive/10 transition-colors text-destructive"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="h-5 w-5" />
                    <span className="text-sm font-medium">Sign Out</span>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
