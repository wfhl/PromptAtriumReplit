import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { MARKETPLACE_ENABLED } from "@/config/features";
import { NotificationModal } from "@/components/NotificationModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Lightbulb, Plus, ChevronDown, Crown, LogOut, Moon, Sun, User as UserIcon, Users, Eye, Menu, X, Settings, FolderPlus, FileUp, BookOpen, GraduationCap, Sparkles, Image, FileSearch, Download, Shield, ScrollText, FileText, Code2, Wand2, Coins, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { redirectToLogin } from "@/utils/auth-redirect";
import { PromptModal } from "@/components/PromptModal";
import { BulkImportModal } from "@/components/BulkImportModal";
import { IntroductionModal } from "@/components/IntroductionModal";
import { MobilePageNav } from "@/components/MobilePageNav";
import { CollectionsSidebar } from "@/components/CollectionsSidebar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, Collection, UserCommunity } from "@shared/schema";

import { AppHeader, HEADER_BACKGROUND } from "@/components/AppHeader";

interface LayoutProps {
  children: React.ReactNode;
  onCreatePrompt?: () => void;
}

const collectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
});

type CollectionFormData = z.infer<typeof collectionSchema>;

export function Layout({ children, onCreatePrompt }: LayoutProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const typedUser = user as User;
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') as 'light' | 'dark' || 'dark';
    }
    return 'dark';
  });

  // Animated underline state and refs
  const navRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [underline, setUnderline] = useState({ left: 0, width: 0, opacity: 0, gradient: 'default' });

  // Modal states
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [bulkImportModalOpen, setBulkImportModalOpen] = useState(false);
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [introductionModalOpen, setIntroductionModalOpen] = useState(false);
  
  // Collections sidebar state (persisted in localStorage)
  const [collectionsSidebarOpen, setCollectionsSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('collectionsSidebarOpen');
      return saved ? saved === 'true' : false;
    }
    return false;
  });

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem('collectionsSidebarOpen', String(collectionsSidebarOpen));
  }, [collectionsSidebarOpen]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        redirectToLogin();
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch user collections for the import modal
  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ["/api/collections"],
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Fetch user credit balance
  const { data: creditBalance } = useQuery<{ balance: number }>({
    queryKey: ["/api/credits/balance"],
    enabled: isAuthenticated && MARKETPLACE_ENABLED,
    staleTime: 60 * 1000, // Refresh every minute
    retry: false,
  });

  // Fetch user's community memberships to check if they're admin of any community
  const { data: userCommunityMemberships = [] } = useQuery<UserCommunity[]>({
    queryKey: ["/api/user/communities"],
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Collection form
  const createCollectionForm = useForm<CollectionFormData>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      name: "",
      description: "",
      isPublic: false,
    },
  });

  // Collection creation mutation
  const createCollectionMutation = useMutation({
    mutationFn: async (data: CollectionFormData) => {
      return await apiRequest("POST", "/api/collections", {
        ...data,
        type: "user",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      createCollectionForm.reset();
      setCreateCollectionModalOpen(false);
      toast({
        title: "Success",
        description: "Collection created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create collection",
        variant: "destructive",
      });
    },
  });

  const handleCreatePrompt = () => {
    setPromptModalOpen(true);
  };

  const handleCreateCollection = () => {
    setCreateCollectionModalOpen(true);
  };

  const handleImportPrompts = () => {
    setBulkImportModalOpen(true);
  };

  const handleOpenIntroduction = () => {
    setIntroductionModalOpen(true);
  };

  const onCreateCollectionSubmit = (data: CollectionFormData) => {
    createCollectionMutation.mutate(data);
  };

  // Helper function to determine if a nav link is active
  const isActiveRoute = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  // Helper to register link refs
  const setLinkRef = (key: string) => (el: HTMLDivElement | null) => {
    linkRefs.current[key] = el;
  };

  // Position underline to element
  function positionTo(el?: HTMLElement | null, path?: string) {
    if (!el || !navRef.current) return;
    const navRect = navRef.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();

    // Determine gradient based on path
    let gradient = 'default';
    if (path === '/library') gradient = 'library';
    else if (path === '/marketplace') gradient = 'marketplace';
    else if (path === '/community') gradient = 'community';
    else if (path === '/admin') gradient = 'admin';
    else if (path === '/dev') gradient = 'dev';

    setUnderline({ 
      left: r.left - navRect.left, 
      width: r.width, 
      opacity: 1,
      gradient
    });
  }

  // Update underline position on route change
  useEffect(() => {
    const activeKey = location.startsWith('/community') ? '/community' 
      : location.startsWith('/library') ? '/library'
      : location.startsWith('/marketplace') ? '/marketplace' 
      : location.startsWith('/admin') ? '/admin'
      : location.startsWith('/dev') ? '/dev'
      : '/';
    positionTo(linkRefs.current[activeKey], activeKey);
  }, [location]);

  // Handle window resize
  useEffect(() => {
    const onResize = () => {
      const activeKey = location.startsWith('/community') ? '/community' 
        : location.startsWith('/library') ? '/library'
        : location.startsWith('/marketplace') ? '/marketplace' 
        : location.startsWith('/admin') ? '/admin'
        : location.startsWith('/dev') ? '/dev'
        : '/';
      positionTo(linkRefs.current[activeKey], activeKey);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [location]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <img 
            src="/ATRIUM2 090725.png" 
            alt="PromptAtrium Logo" 
            className="w-8 h-8 object-contain mx-auto mb-4 animate-pulse"
          />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen relative">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-96 h-96 bg-indigo-900/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-purple-900/10 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-20 w-64 h-64 bg-cyan-900/10 rounded-full blur-xl"></div>

        {/* Decorative grid lines */}
        <div className="absolute inset-0 grid grid-cols-12 opacity-0 pointer-events-none">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={`col-${i}`} className="border-r border-cyan-500"></div>
          ))}
        </div>
      </div>

      {/* Header - background controlled by HEADER_BACKGROUND in AppHeader.tsx */}
      <header className={`fixed top-0 left-0 right-0 ${HEADER_BACKGROUND} border-cyan-500/30 z-50 transition-all duration-300`}>
        <div className="container mx-auto px-1 sm:px-1 md:px-1 py-1 flex items-center justify-between">
          <AppHeader 
            location={location}
            user={user as any}
            userCommunityMemberships={userCommunityMemberships}
            navRef={navRef}
            linkRefs={linkRefs}
            underline={underline}
            isActiveRoute={isActiveRoute}
            positionTo={positionTo}
            handleOpenIntroduction={handleOpenIntroduction}
            toast={toast}
            sidebarOpen={collectionsSidebarOpen}
            onToggleSidebar={() => setCollectionsSidebarOpen((prev) => !prev)}
          />

          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Credits Balance */}
            {MARKETPLACE_ENABLED && (
              <Link href="/credits">
                <Button
                  variant="ghost"
                  className="hidden md:flex items-center gap-2 text-yellow-500 hover:text-yellow-400 px-3 h-8"
                  data-testid="button-credits"
                >
                  <Coins className="w-4 h-4" />
                  <span className="font-medium">
                    {creditBalance ? creditBalance.balance.toLocaleString() : '0'} credits
                  </span>
                </Button>
              </Link>
            )}

            {/* Notification Bell */}
            <NotificationBell onClick={() => setNotificationModalOpen(true)} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  className="relative h-8 w-8 bg-gradient-to-br from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 border border-purple-500/20 overflow-hidden"
                  data-testid="button-new-menu"
                >
                  <div className="absolute inset-0 before:content-[''] before:absolute before:inset-0 before:bg-[linear-gradient(90deg,transparent,#6366f1,#a855f7,#ec4899,transparent)] before:w-[200%] before:animate-shine before:opacity-30" />
                  <Plus className="h-5 w-5 relative z-10" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48" data-testid="dropdown-new-menu">
                <DropdownMenuItem 
                  onClick={handleCreatePrompt}
                  className="cursor-pointer"
                  data-testid="menu-new-prompt"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Prompt
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleCreateCollection}
                  className="cursor-pointer"
                  data-testid="menu-new-collection"
                >
                  <FolderPlus className="mr-2 h-4 w-4" />
                  New Collection
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleImportPrompts}
                  className="cursor-pointer"
                  data-testid="menu-import-prompts"
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  Import Prompts
                </DropdownMenuItem>
                <Link href="/tools/quick-prompter">
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    data-testid="menu-generate-prompt"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Prompt
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 text-gray-300 hover:text-cyan-400" data-testid="button-user-menu">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center border border-cyan-400/30">
                    {typedUser?.profileImageUrl ? (
                      <img
                        src={typedUser.profileImageUrl}
                        alt="Profile"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium text-white">
                        {typedUser?.firstName?.[0] || typedUser?.email?.[0] || "U"}
                      </span>
                    )}
                  </div>
                  <span className="hidden md:block text-sm font-medium" data-testid="text-username">
                    {typedUser?.firstName || typedUser?.email?.split("@")[0] || "User"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" data-testid="dropdown-user-menu">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {typedUser?.firstName ? `${typedUser.firstName} ${typedUser.lastName || ''}` : typedUser?.email?.split("@")[0] || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {typedUser?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link href={`/user/${typedUser?.username}`} className="flex items-center cursor-pointer" data-testid="menu-view-profile">
                    <UserIcon className="mr-2 h-4 w-4" />
                    View Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile/settings" className="flex items-center cursor-pointer" data-testid="menu-profile-settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link 
                    href={`/user/${typedUser?.username}?tab=followers`}
                    className="flex items-center cursor-pointer" 
                    data-testid="menu-followers"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Followers
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link 
                    href={`/user/${typedUser?.username}?tab=following`}
                    className="flex items-center cursor-pointer" 
                    data-testid="menu-following"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Following
                  </Link>
                </DropdownMenuItem>

                {MARKETPLACE_ENABLED && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/seller/dashboard" className="flex items-center cursor-pointer" data-testid="menu-start-selling">
                        <DollarSign className="mr-2 h-4 w-4" />
                        Start Selling
                      </Link>
                    </DropdownMenuItem>
                    {/* Credits Balance - Visible on Mobile */}
                    <div className="md:hidden px-2 py-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center text-muted-foreground">
                          <DollarSign className="mr-4 h-4 w-4" />
                            Credits
                        </span>
                        <span className="font-semibold text-primary">
                          {creditBalance ? creditBalance.balance.toLocaleString() : '0'}
                        </span>
                      </div>
                    </div>
                    
                    <DropdownMenuSeparator className="md:hidden" />
                  </>
                )}




                <DropdownMenuItem asChild>
                  <Link href="/prompt-history" className="flex items-center cursor-pointer" data-testid="menu-prompt-history">
                    <FileText className="mr-2 h-4 w-4" />
                    Prompt History
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Display Preferences
                </DropdownMenuLabel>

                <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer" data-testid="menu-theme-toggle">
                  {theme === 'light' ? (
                    <>
                      <Moon className="mr-2 h-4 w-4" />
                      Switch to Dark Mode
                    </>
                  ) : (
                    <>
                      <Sun className="mr-2 h-4 w-4" />
                      Switch to Light Mode
                    </>
                  )}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link href="/terms" className="flex items-center cursor-pointer" data-testid="menu-terms">
                    <ScrollText className="mr-2 h-4 w-4" />
                    Terms & Conditions
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/privacy-policy" className="flex items-center cursor-pointer" data-testid="menu-privacy">
                    <Shield className="mr-2 h-4 w-4" />
                    Privacy Policy
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600" data-testid="menu-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Button - Now on the right */}
            <Button
              variant="ghost"
              className="md:hidden h-8 w-8 p-0 text-gray-300 hover:text-cyan-400"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-gray-900/30 backdrop-blur-lg border-b border-cyan-500/30 mobile-nav-dropdown">
            <nav className="container mx-auto px-2 sm:px-4 py-2 flex flex-col space-y-1">
              <Link 
                href="/" 
                className={isActiveRoute("/") ? "text-gray-400 font-medium py-2" : "text-gray-300 hover:text-cyan-400 transition-colors py-2"} 
                onClick={() => setMobileMenuOpen(false)}
                data-testid="mobile-nav-dashboard"
              >
                Dashboard
              </Link>
              <Link 
                href="/library" 
                className={isActiveRoute("/library") ? "nav-gradient-library font-medium py-2 whitespace-nowrap" : "nav-gradient-library transition-colors py-2 whitespace-nowrap"} 
                onClick={() => setMobileMenuOpen(false)}
                data-testid="mobile-nav-library"
              >
                My Library
              </Link>
              <Link 
                href="/community" 
                className={isActiveRoute("/community") ? "nav-gradient-community font-medium py-2" : "nav-gradient-community transition-colors py-2"} 
                onClick={() => setMobileMenuOpen(false)}
                data-testid="mobile-nav-community"
              >
                Community
              </Link>
              {MARKETPLACE_ENABLED && (
                <Link 
                  href="/marketplace" 
                  className={isActiveRoute("/marketplace") ? "nav-gradient-marketplace font-medium py-2" : "nav-gradient-marketplace transition-colors py-2"} 
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid="mobile-nav-marketplace"
                >
                  Marketplace
                </Link>
              )}

              {(typedUser?.role === "super_admin" || typedUser?.role === "community_admin" || typedUser?.role === "developer" || userCommunityMemberships.some(m => m.role === "admin")) && (
                <Link 
                  href="/admin" 
                  className={isActiveRoute("/admin") ? "text-yellow-400 px-2 py-2 rounded-md bg-yellow-400/10 border border-yellow-400/30 flex items-center gap-1 font-medium" : "text-yellow-400 hover:text-yellow-300 px-2 py-2 rounded-md transition-colors flex items-center gap-1"} 
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid="mobile-nav-admin"
                >
                  <Crown className="h-4 w-4" />
                  Admin
                </Link>
              )}

              {typedUser?.role === "developer" && (
                <Link 
                  href="/dev" 
                  className={isActiveRoute("/dev") ? "text-cyan-400 px-2 py-2 rounded-md bg-cyan-400/10 border border-cyan-400/30 flex items-center gap-1 font-medium" : "text-cyan-400 hover:text-cyan-300 px-2 py-2 rounded-md transition-colors flex items-center gap-1"} 
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid="mobile-nav-dev"
                >
                  <Code2 className="h-4 w-4" />
                  Dev
                </Link>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-gray-300 hover:text-cyan-400 transition-colors py-2 w-full flex justify-between items-center bg-transparent border-none outline-none focus:outline-none rounded-md" data-testid="mobile-nav-resources">
                    <span>Resources</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48" data-testid="mobile-dropdown-resources">
                  <DropdownMenuItem 
                    onClick={() => {
                      handleOpenIntroduction();
                      setMobileMenuOpen(false);
                    }}
                    className="cursor-pointer"
                    data-testid="mobile-menu-account-setup"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Account Setup
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/prompting-guides" className="flex items-center cursor-pointer" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-menu-prompting-guides">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Prompting Guides
                    </Link>
                  </DropdownMenuItem>
                
                  
                  <DropdownMenuItem asChild>
                    <Link to="/ai-services" className="flex items-center cursor-pointer" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-menu-ai-sevices">
                      <BookOpen className="mr-2 h-4 w-4" />
                      AI Services
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      toast({
                        title: "Coming Soon",
                        description: "Learning Resources will be available soon!",
                      });
                      setMobileMenuOpen(false);
                    }}
                    className="cursor-pointer"
                    data-testid="mobile-menu-learning-resources"
                  >
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Learning Resources
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      toast({
                        title: "Coming Soon",
                        description: "Assets will be available soon!",
                      });
                      setMobileMenuOpen(false);
                    }}
                    className="cursor-pointer"
                    data-testid="mobile-menu-assets"
                  >
                    <Image className="mr-2 h-4 w-4" />
                    Assets
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/install-guide" className="flex items-center cursor-pointer" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-menu-install-guide">
                      <Download className="mr-2 h-4 w-4" />
                      Install Guide
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/getting-started" className="flex items-center cursor-pointer" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-menu-getting-started">
                      <FileText className="mr-2 h-4 w-4" />
                      Getting Started
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-gray-300 hover:text-cyan-400 transition-colors py-2 w-full flex justify-between items-center bg-transparent border-none outline-none focus:outline-none rounded-md" data-testid="mobile-nav-tools">
                    <span>Tools</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48" data-testid="mobile-dropdown-tools">
                  <DropdownMenuItem asChild>
                    <Link 
                      href="/tools/aspect-ratio-calculator" 
                      className="flex items-center cursor-pointer" 
                      onClick={() => setMobileMenuOpen(false)}
                      data-testid="mobile-menu-aspect-ratio-calculator"
                    >
                      <Image className="mr-2 h-4 w-4" />
                      Aspect Ratio Calculator
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link 
                      href="/tools/metadata-analyzer" 
                      className="flex items-center cursor-pointer" 
                      onClick={() => setMobileMenuOpen(false)}
                      data-testid="mobile-menu-metadata-analyzer"
                    >
                      <FileSearch className="mr-2 h-4 w-4" />
                      Metadata Analyzer
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      toast({
                        title: "Coming Soon",
                        description: "Prompt Generator will be available soon!",
                      });
                      setMobileMenuOpen(false);
                    }}
                    className="cursor-pointer"
                    data-testid="mobile-menu-prompt-generator"
                  >
                    <Lightbulb className="mr-2 h-4 w-4" />
                    Prompt Generator
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/codex" className="flex items-center cursor-pointer" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-menu-wordsmith-codex">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Wordsmith Codex
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

            </nav>
          </div>
        )}
      </header>

      {/* Collections Sidebar */}
      <CollectionsSidebar
        isOpen={collectionsSidebarOpen}
        onCreateCollection={() => setCreateCollectionModalOpen(true)}
      />

      {/* Main Content */}
      <main 
        className={`pt-16 relative z-10 transition-all duration-300 ease-in-out overflow-x-hidden ${
          collectionsSidebarOpen ? 'ml-64' : 'ml-0'
        }`}
      >
        {children}
      </main>

      {/* Mobile Page Navigation */}
      <MobilePageNav />

      {/* Global Modals */}
      <PromptModal
        open={promptModalOpen}
        onOpenChange={setPromptModalOpen}
        prompt={null}
        mode="create"
      />

      <BulkImportModal
        open={bulkImportModalOpen}
        onOpenChange={setBulkImportModalOpen}
        collections={collections}
      />

      {/* Create Collection Modal */}
      <Dialog open={createCollectionModalOpen} onOpenChange={setCreateCollectionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Collection</DialogTitle>
          </DialogHeader>
          <Form {...createCollectionForm}>
            <form onSubmit={createCollectionForm.handleSubmit(onCreateCollectionSubmit)} className="space-y-4">
              <FormField
                control={createCollectionForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Collection Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Creative Writing, Business Ideas" {...field} data-testid="input-collection-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createCollectionForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what this collection contains..."
                        {...field}
                        data-testid="textarea-collection-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createCollectionForm.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Make Public</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Allow others to view and use this collection
                      </p>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                        data-testid="checkbox-collection-public"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setCreateCollectionModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCollectionMutation.isPending}>
                  {createCollectionMutation.isPending ? "Creating..." : "Create Collection"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Notification Modal */}
      <NotificationModal 
        open={notificationModalOpen} 
        onOpenChange={setNotificationModalOpen} 
      />

      {/* Introduction Modal */}
      {typedUser && (
        <IntroductionModal
          open={introductionModalOpen}
          onComplete={() => {
            setIntroductionModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          }}
          user={typedUser}
        />
      )}
    </div>
  );
}