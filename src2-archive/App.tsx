import { Toaster } from "@/components/ui/toaster";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Library from "./pages/Library";
import Create from "./pages/Create";
import Pricing from "./pages/Pricing";
import Credits from "./pages/Credits";
import Subscription from "./pages/Subscription";
import Profile from "./pages/Profile";
import AIApps from "./pages/AIApps";
import Help from "./pages/Help";
import Support from "./pages/Support";
import Referrals from "./pages/Referrals";
import NotFound from "./pages/NotFound";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminGenerations from "./pages/admin/AdminGenerations";
import AdminCredits from "./pages/admin/AdminCredits";
import AdminRoles from "./pages/admin/AdminRoles";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminMigration from "./pages/admin/AdminMigration";
import AdminMarketing from "./pages/admin/AdminMarketing";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/library" element={<Library />} />
            <Route path="/create" element={<Create />} />
            <Route path="/create/:type" element={<Create />} />
            <Route path="/create/:type/:appId" element={<Create />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/credits" element={<Credits />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/ai-apps" element={<AIApps />} />
            <Route path="/ai-apps/:appId" element={<AIApps />} />
            <Route path="/help" element={<Help />} />
            <Route path="/support" element={<Support />} />
            <Route path="/referrals" element={<Referrals />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/generations" element={<AdminGenerations />} />
            <Route path="/admin/credits" element={<AdminCredits />} />
            <Route path="/admin/roles" element={<AdminRoles />} />
            <Route path="/admin/support" element={<AdminSupport />} />
            
            <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
            <Route path="/admin/migration" element={<AdminMigration />} />
            <Route path="/admin/marketing" element={<AdminMarketing />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
