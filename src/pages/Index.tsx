import TopMenu from "@/components/TopMenu";
import Sidebar from "@/components/Sidebar";
import HeroSection from "@/components/HeroSection";
import ToolsGrid from "@/components/ToolsGrid";
import FeaturedSection from "@/components/FeaturedSection";
import EffectsSection from "@/components/EffectsSection";
import ModelsSection from "@/components/ModelsSection";
import BottomNav from "@/components/BottomNav";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Menu */}
      <TopMenu />

      <div className="flex">
        {/* Sidebar - Desktop */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 pb-20 md:pb-0">
          <div className="max-w-7xl mx-auto">
            <HeroSection />
            <ToolsGrid />
            <FeaturedSection />
            <EffectsSection />
            <ModelsSection />
          </div>
        </main>
      </div>

      {/* Bottom Nav - Mobile */}
      <BottomNav />
    </div>
  );
};

export default Index;
