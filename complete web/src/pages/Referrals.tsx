import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ReferralSection } from "@/components/ReferralSection";
import TopMenu from "@/components/TopMenu";
import BottomNav from "@/components/BottomNav";

const Referrals = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <TopMenu />
      
      <main className="container max-w-4xl mx-auto px-4 py-8 pb-24">
        <Button 
          variant="ghost" 
          className="mb-6 gap-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Referral Program</h1>
          <p className="text-muted-foreground">
            Invite friends and earn credits when they subscribe
          </p>
        </div>

        <ReferralSection />
      </main>

      <BottomNav />
    </div>
  );
};

export default Referrals;
