import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Copy, Check, Gift, Users, Coins } from "lucide-react";

interface Referral {
  id: string;
  status: string;
  credits_awarded: number;
  created_at: string;
  completed_at: string | null;
}

export const ReferralSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchReferralData();
    }
  }, [user]);

  const fetchReferralData = async () => {
    if (!user) return;

    try {
      // Get user's referral code
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("referral_code, id")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;
      setReferralCode(profile?.referral_code || null);

      // Get referrals
      if (profile?.id) {
        const { data: referralData, error: referralError } = await supabase
          .from("referrals")
          .select("*")
          .eq("referrer_id", profile.id)
          .order("created_at", { ascending: false });

        if (referralError) throw referralError;
        setReferrals(referralData || []);
      }
    } catch (error) {
      console.error("Error fetching referral data:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = async () => {
    if (!referralCode) return;
    
    const referralLink = `${window.location.origin}/auth?ref=${referralCode}`;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const completedReferrals = referrals.filter(r => r.status === "completed");
  const pendingReferrals = referrals.filter(r => r.status === "pending");
  const totalCreditsEarned = completedReferrals.reduce((sum, r) => sum + r.credits_awarded, 0);

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Referral Program
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Referral Program
        </CardTitle>
        <CardDescription>
          Invite friends and earn 50 credits when they start a subscription!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Referral Link */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Your Referral Link</label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={referralCode ? `${window.location.origin}/auth?ref=${referralCode}` : "Loading..."}
              className="bg-background/50 font-mono text-sm"
            />
            <Button
              onClick={copyReferralLink}
              variant="outline"
              size="icon"
              disabled={!referralCode}
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-background/50 rounded-lg p-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{completedReferrals.length}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="bg-background/50 rounded-lg p-4 text-center">
            <Gift className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{pendingReferrals.length}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="bg-background/50 rounded-lg p-4 text-center">
            <Coins className="h-5 w-5 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold text-primary">{totalCreditsEarned}</div>
            <div className="text-xs text-muted-foreground">Credits Earned</div>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-primary/5 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm">How it works:</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Share your unique referral link with friends</li>
            <li>They sign up using your link</li>
            <li>When they start a subscription, you earn 50 credits!</li>
          </ol>
        </div>

        {/* Recent Referrals */}
        {referrals.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Referrals</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {referrals.slice(0, 5).map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between bg-background/50 rounded-lg p-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${
                      referral.status === "completed" ? "bg-green-500" : "bg-yellow-500"
                    }`} />
                    <span className="text-muted-foreground">
                      {new Date(referral.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={referral.status === "completed" ? "text-green-500" : "text-yellow-500"}>
                    {referral.status === "completed" ? `+${referral.credits_awarded} credits` : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralSection;
