import TopMenu from "@/components/TopMenu";
import HeroSection from "@/components/HeroSection";
import ToolsGrid from "@/components/ToolsGrid";
import FeaturedSection from "@/components/FeaturedSection";
import EffectsSection from "@/components/EffectsSection";
import BottomNav from "@/components/BottomNav";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Menu */}
      <TopMenu />

      {/* Main Content - No sidebar on homepage */}
      <main className="pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto">
          <HeroSection />
          <ToolsGrid />
          <FeaturedSection />
          <EffectsSection />
        </div>
      </main>

      {/* Bottom Nav - Mobile */}
      <BottomNav />
    </div>
  );
};

export default Index;
