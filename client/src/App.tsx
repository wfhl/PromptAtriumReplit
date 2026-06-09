import { useState, useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { useMarketplaceEnabled } from "@/config/features";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Library from "@/pages/library";
import Community from "@/pages/community";
import Projects from "@/pages/projects";
import Admin from "@/pages/admin";
import Dev from "@/pages/Dev";
import Collections from "@/pages/collections";
import CollectionView from "@/pages/CollectionView";
import Communities from "@/pages/Communities";
import CommunityDetail from "@/pages/CommunityDetail";
import Invite from "@/pages/invite";
import ProfileSettings from "@/pages/profile-settings";
import UserProfile from "@/pages/user-profile";
import LikedPrompts from "@/pages/LikedPrompts";
import BranchedPrompts from "@/pages/BranchedPrompts";
import AspectRatioCalculatorPage from "@/pages/tools/aspect-ratio-calculator";
import MetadataAnalyzerPage from "@/pages/tools/metadata-analyzer";
import QuickPrompterPage from "@/pages/tools/quick-prompter";
import PromptMinerPage from "@/pages/tools/prompt-miner";
import InstallGuide from "@/pages/install-guide";
import PromptDetail from "@/pages/prompt-detail";
import PromptHistoryPage from "@/pages/prompt-history";
import PromptingGuides from "@/pages/prompting-guides";
import AIServices from "@/pages/ai-services";
import GettingStarted from "@/pages/getting-started";
import PrivacyPolicy from "@/pages/privacy-policy";
import TermsAndConditions from "@/pages/terms";
import Codex from "@/pages/Codex";
import Tools from "@/pages/tools";
import Credits from "@/pages/Credits";
import SellerDashboard from "@/pages/SellerDashboard";
import Marketplace from "@/pages/Marketplace";
import ListingDetail from "@/pages/ListingDetail";
import MarketplaceDocs from "@/pages/MarketplaceDocs";
import { PurchaseHistory } from "@/pages/PurchaseHistory";
import { AdminDisputes } from "@/pages/AdminDisputes";
import SubCommunityAdminDashboard from "@/pages/SubCommunityAdminDashboard";
import { GlobalSubCommunityAdmin } from "@/pages/GlobalSubCommunityAdmin";
import SubCommunityContent from "@/pages/SubCommunityContent";
import SubCommunityDocs from "@/pages/SubCommunityDocs";
import InviteAcceptPage from "@/pages/InviteAccept";
import BlankPage from "@/pages/blank";
import { IntroductionModal } from "@/components/IntroductionModal";
import { useAuth } from "@/hooks/useAuth";
import { useDynamicManifest } from "@/hooks/useDynamicManifest";
import type { User } from "@shared/schema";

function Router() {
  const MARKETPLACE_ENABLED = useMarketplaceEnabled();
  const { isAuthenticated, isLoading, user } = useAuth();
  useDynamicManifest();
  const [showIntroModal, setShowIntroModal] = useState(false);
  
  useEffect(() => {
    // Show intro modal if user is authenticated and hasn't completed intro
    // Only show if they don't have a username set
    if (isAuthenticated && user && !(user as User).hasCompletedIntro && !(user as User).username) {
      setShowIntroModal(true);
    } else if (isAuthenticated && user && (user as User).hasCompletedIntro) {
      // If intro is completed, make sure modal is closed
      setShowIntroModal(false);
    }
  }, [isAuthenticated, user]);

  
  const handleIntroComplete = () => {
    setShowIntroModal(false);
    // Refresh user data to reflect the changes
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  };

  return (
    <>
      {/* Introduction Modal for new users */}
      {isAuthenticated && user && (
        <IntroductionModal
          open={showIntroModal}
          onComplete={handleIntroComplete}
          user={user}
        />
      )}
      
      <Switch>
        {/* Public routes - always accessible */}
        <Route path="/prompt/:id">
          {() => isAuthenticated ? <Layout><PromptDetail /></Layout> : <PromptDetail />}
        </Route>
        <Route path="/user/:username">
          {() => isAuthenticated ? <Layout><UserProfile /></Layout> : <UserProfile />}
        </Route>
        <Route path="/tools/aspect-ratio-calculator">
          {() => isAuthenticated ? <Layout><AspectRatioCalculatorPage /></Layout> : <AspectRatioCalculatorPage />}
        </Route>
        <Route path="/tools/metadata-analyzer">
          {() => isAuthenticated ? <Layout><MetadataAnalyzerPage /></Layout> : <MetadataAnalyzerPage />}
        </Route>
        <Route path="/tools/quick-prompter">
          {() => isAuthenticated ? <Layout><QuickPrompterPage /></Layout> : <QuickPrompterPage />}
        </Route>
        <Route path="/tools/prompt-miner">
          {() => isAuthenticated ? <Layout><PromptMinerPage /></Layout> : <PromptMinerPage />}
        </Route>
        <Route path="/marketplace">
          {() => !MARKETPLACE_ENABLED ? <Redirect to="/" /> : isAuthenticated ? <Layout><Marketplace /></Layout> : <Marketplace />}
        </Route>
        <Route path="/marketplace/listing/:id">
          {() => !MARKETPLACE_ENABLED ? <Redirect to="/" /> : isAuthenticated ? <Layout><ListingDetail /></Layout> : <ListingDetail />}
        </Route>
        <Route path="/marketplace/help">
          {() => !MARKETPLACE_ENABLED ? <Redirect to="/" /> : isAuthenticated ? <Layout><MarketplaceDocs /></Layout> : <MarketplaceDocs />}
        </Route>
        {/* When marketplace is disabled, redirect these auth-only marketplace URLs to home
            for ALL users (including unauthenticated) so they never fall through to 404.
            Re-enabling is a single flag flip — these guards become inert. */}
        {!MARKETPLACE_ENABLED && <Route path="/credits"><Redirect to="/" /></Route>}
        {!MARKETPLACE_ENABLED && <Route path="/seller/dashboard"><Redirect to="/" /></Route>}
        {!MARKETPLACE_ENABLED && <Route path="/admin/disputes"><Redirect to="/" /></Route>}
        {!MARKETPLACE_ENABLED && <Route path="/purchases"><Redirect to="/" /></Route>}
        <Route path="/prompting-guides">
          {() => isAuthenticated ? <Layout><PromptingGuides /></Layout> : <PromptingGuides />}
        </Route>
        <Route path="/ai-services">
          {() => isAuthenticated ? <Layout><AIServices /></Layout> : <AIServices />}
        </Route>
        <Route path="/getting-started">
          {() => isAuthenticated ? <Layout><GettingStarted /></Layout> : <GettingStarted />}
        </Route>
        <Route path="/privacy-policy">
          {() => isAuthenticated ? <Layout><PrivacyPolicy /></Layout> : <PrivacyPolicy />}
        </Route>
        <Route path="/terms">
          {() => isAuthenticated ? <Layout><TermsAndConditions /></Layout> : <TermsAndConditions />}
        </Route>
        <Route path="/docs/sub-communities">
          {() => isAuthenticated ? <Layout><SubCommunityDocs /></Layout> : <SubCommunityDocs />}
        </Route>
        <Route path="/invite/sub-community/:code" component={InviteAcceptPage} />
        <Route path="/invite/:code" component={Invite} />
        <Route path="/invite" component={Invite} />
        
        {/* Conditional routes based on authentication */}
        {isLoading || !isAuthenticated ? (
          <Route path="/" component={Landing} />
        ) : (
          <>
            <Route path="/">
              {() => <Layout><Dashboard /></Layout>}
            </Route>
            <Route path="/library">
              {() => <Layout><Library /></Layout>}
            </Route>
            <Route path="/community">
              {() => <Layout><Community /></Layout>}
            </Route>
            <Route path="/communities">
              {() => <Layout><Communities /></Layout>}
            </Route>
            <Route path="/community/:id">
              {() => <Layout><CommunityDetail /></Layout>}
            </Route>
            <Route path="/sub-community/:id/admin">
              {() => <Layout><SubCommunityAdminDashboard /></Layout>}
            </Route>
            <Route path="/sub-community/:id/content">
              {() => <Layout><SubCommunityContent /></Layout>}
            </Route>
            <Route path="/tools">
              {() => <Layout><Tools /></Layout>}
            </Route>
            <Route path="/projects">
              {() => <Layout><Projects /></Layout>}
            </Route>
            <Route path="/collections">
              {() => <Layout><Collections /></Layout>}
            </Route>
            <Route path="/collection/:id">
              {() => <Layout><CollectionView /></Layout>}
            </Route>
            <Route path="/credits">
              {() => <Layout><Credits /></Layout>}
            </Route>
            <Route path="/seller/dashboard">
              {() => <Layout><SellerDashboard /></Layout>}
            </Route>
            <Route path="/admin">
              {() => <Layout><Admin /></Layout>}
            </Route>
            <Route path="/admin/sub-communities">
              {() => <Layout><GlobalSubCommunityAdmin /></Layout>}
            </Route>
            <Route path="/admin/disputes">
              {() => <Layout><AdminDisputes /></Layout>}
            </Route>
            <Route path="/dev">
              {() => <Layout><Dev /></Layout>}
            </Route>
            <Route path="/profile/settings">
              {() => <Layout><ProfileSettings /></Layout>}
            </Route>
            <Route path="/liked-prompts">
              {() => <Layout><LikedPrompts /></Layout>}
            </Route>
            <Route path="/branched-prompts">
              {() => <Layout><BranchedPrompts /></Layout>}
            </Route>
            <Route path="/install-guide">
              {() => <Layout><InstallGuide /></Layout>}
            </Route>
            <Route path="/codex">
              {() => <Layout><Codex /></Layout>}
            </Route>
            <Route path="/prompt-history">
              {() => <Layout><PromptHistoryPage /></Layout>}
            </Route>
            <Route path="/purchases">
              {() => <Layout><PurchaseHistory /></Layout>}
            </Route>
          </>
        )}
        
        {/* Blank page - accessible to all */}
        <Route path="/blank" component={BlankPage} />
        
        {/* 404 fallback - must be last */}
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
