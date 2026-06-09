import { useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { FileText, Users, Wrench, ShoppingBag, Home, Crown } from "lucide-react";
import { useLongPress } from "@/hooks/useLongPress";
import { NavTabDropdown } from "./NavTabDropdown";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { User, UserCommunity } from "@shared/schema";
import { useMarketplaceEnabled } from "@/config/features";

export function MobilePageNav() {
  const MARKETPLACE_ENABLED = useMarketplaceEnabled();
  const { user, isAuthenticated } = useAuth();
  const typedUser = user as User;
  const [location, setLocation] = useLocation();
  const [openDropdown, setOpenDropdown] = useState<'library' | 'tools' | 'community' | 'marketplace' | null>(null);
  
  const isDashboard = location === "/";
  const isLibraryPage = location === "/library";
  const isCommunityPage = location === "/community";
  const isToolsPage = location === "/tools";
  const isMarketplacePage = location.startsWith("/marketplace");
  const isAdminPage = location.startsWith("/admin");
  
  // Fetch user's community memberships to check if they're admin of any community
  const { data: userCommunityMemberships = [] } = useQuery<UserCommunity[]>({
    queryKey: ["/api/user/communities"],
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
  
  // Check if user has admin access
  const hasAdminAccess = typedUser?.role === "super_admin" || typedUser?.role === "community_admin" || typedUser?.role === "developer" || userCommunityMemberships.some(m => m.role === "admin");

  // Button refs for dropdown positioning
  const homeButtonRef = useRef<HTMLButtonElement>(null);
  const libraryButtonRef = useRef<HTMLButtonElement>(null);
  const toolsButtonRef = useRef<HTMLButtonElement>(null);
  const communityButtonRef = useRef<HTMLButtonElement>(null);
  const marketplaceButtonRef = useRef<HTMLButtonElement>(null);

  // Long press handlers for each button
  const libraryLongPress = useLongPress({
    onLongPress: () => setOpenDropdown('library'),
    onClick: () => setLocation('/library')
  });

  const toolsLongPress = useLongPress({
    onLongPress: () => setOpenDropdown('tools'),
    onClick: () => setLocation('/tools')
  });

  const communityLongPress = useLongPress({
    onLongPress: () => setOpenDropdown('community'),
    onClick: () => setLocation('/community')
  });

  const marketplaceLongPress = useLongPress({
    onLongPress: () => setOpenDropdown('marketplace'),
    onClick: () => setLocation('/marketplace')
  });

  return (
    <>
      {/* Extended blur effect below nav */}
      <div className="block lg:hidden fixed left-0 right-0 bottom-0 z-40 h-6 bg-background/95 dark:bg-background/95 backdrop-blur-sm pointer-events-none" />

      <div className="block border-transparent lg:hidden fixed left-0 right-0 bottom-0 z-50 bg-background/95 dark:bg-background/95 backdrop-blur-sm border-t border-border p-2 pb-safe mobile-nav-fixed">
        <div className="flex gap-1 max-w-screen-xl mx-auto">
          {/* Home Button */}
          <div className="flex-1">
            <Button 
              ref={homeButtonRef}
              variant="outline"
              className={`w-full relative group px-1 py-2 h-auto border-transparent select-none ${isDashboard ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700' : 'bg-gray-900/70 hover:bg-white/5'}`}
              data-testid="button-home"
              onClick={() => setLocation('/')}
            >
              <div className="flex flex-col items-center gap-0.5">
                <Home className={`h-4 w-4 text-white transition-all ${!isDashboard ? 'group-hover:scale-110 group-hover:brightness-150' : ''}`} />
                <span className={`text-[9px] ${isDashboard ? 'text-white' : 'text-white/80'}`}>Home</span>
              </div>
              {isDashboard && (
                <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
              )}
            </Button>
          </div>
          
          {/* Library/Prompts Button */}
          <div className="flex-1">
            <Button 
              ref={libraryButtonRef}
              variant="outline"
              className={`w-full relative group px-1 py-2 h-auto border-transparent select-none ${isLibraryPage ? 'button-gradient-library hover:color-white' : 'bg-gray-900/70 hover:bg-white/5'}`}
              data-testid="button-my-prompts"
              {...libraryLongPress}
            >
              <div className="flex flex-col items-center gap-0.5">
                <FileText className={`h-4 w-4 text-white transition-all ${!isLibraryPage ? 'group-hover:scale-110 group-hover:brightness-150' : ''}`} />
                <span className={`text-[9px] ${!isLibraryPage ? 'nav-gradient-library' : ''}`}>Prompts</span>
              </div>
              {isLibraryPage && (
                <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
              )}
            </Button>
          </div>
          
          {/* Tools Button */}
          <div className="flex-1">
            <Button 
              ref={toolsButtonRef}
              variant="outline"
              className={`w-full relative group px-1 py-2 h-auto border-transparent select-none ${isToolsPage ? 'button-gradient-tools hover:color-white' : 'bg-gray-900/70 hover:bg-white/5'}`}
              data-testid="button-tools"
              {...toolsLongPress}
            >
              <div className="flex flex-col items-center gap-0.5">
                <Wrench className={`h-4 w-4 text-white transition-all ${!isToolsPage ? 'group-hover:scale-110 group-hover:brightness-150' : ''}`} />
                <span className={`text-[9px] ${!isToolsPage ? 'nav-gradient-tools' : ''}`}>Tools</span>
              </div>
              {isToolsPage && (
                <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
              )}
            </Button>
          </div>
          
          {/* Community Button */}
          <div className="flex-1">
            <Button 
              ref={communityButtonRef}
              variant="outline"
              className={`w-full relative group px-1 py-2 h-auto border-transparent select-none ${isCommunityPage ? 'button-gradient-community hover:color-white' : 'bg-gray-900/70 hover:bg-white/5'}`}
              data-testid="button-community-prompts"
              {...communityLongPress}
            >
              <div className="flex flex-col items-center gap-0.5">
                <Users className={`h-4 w-4 text-white transition-all ${!isCommunityPage ? 'group-hover:scale-110 group-hover:brightness-150' : ''}`} />
                <span className={`text-[9px] ${!isCommunityPage ? 'nav-gradient-community' : ''}`}>Comm</span>
              </div>
              {isCommunityPage && (
                <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
              )}
            </Button>
          </div>

          {/* Admin Button - Only show for admin users */}
          {hasAdminAccess && (
            <div className="flex-1">
              <Button 
                variant="outline"
                className={`w-full relative group px-1 py-2 h-auto border-transparent select-none ${isAdminPage ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600' : 'bg-gray-900/70 hover:bg-white/5'}`}
                data-testid="button-admin"
                onClick={() => setLocation('/admin')}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <Crown className={`h-4 w-4 ${isAdminPage ? 'text-white' : 'text-yellow-400'} transition-all ${!isAdminPage ? 'group-hover:scale-110 group-hover:brightness-150' : ''}`} />
                  <span className={`text-[9px] ${isAdminPage ? 'text-white' : 'text-yellow-400'}`}>Admin</span>
                </div>
                {isAdminPage && (
                  <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                )}
              </Button>
            </div>
          )}

          {/* Marketplace Button */}
          {MARKETPLACE_ENABLED && (
            <div className="flex-1">
              <Button 
                ref={marketplaceButtonRef}
                variant="outline"
                className={`w-full relative group px-1 py-2 h-auto border-transparent select-none ${isMarketplacePage ? 'button-gradient-marketplace hover:color-white' : 'bg-gray-900/70 hover:bg-white/5'}`}
                data-testid="button-marketplace"
                {...marketplaceLongPress}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <ShoppingBag className={`h-4 w-4 text-white transition-all ${!isMarketplacePage ? 'group-hover:scale-110 group-hover:brightness-150' : ''}`} />
                  <span className={`text-[9px] ${!isMarketplacePage ? 'nav-gradient-marketplace' : ''}`}>Market</span>
                </div>
                {isMarketplacePage && (
                  <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Dropdown menus */}
      <NavTabDropdown
        page="library"
        isOpen={openDropdown === 'library'}
        onClose={() => setOpenDropdown(null)}
        buttonRef={libraryButtonRef}
      />
      <NavTabDropdown
        page="tools"
        isOpen={openDropdown === 'tools'}
        onClose={() => setOpenDropdown(null)}
        buttonRef={toolsButtonRef}
      />
      <NavTabDropdown
        page="community"
        isOpen={openDropdown === 'community'}
        onClose={() => setOpenDropdown(null)}
        buttonRef={communityButtonRef}
      />
      {MARKETPLACE_ENABLED && (
        <NavTabDropdown
          page="marketplace"
          isOpen={openDropdown === 'marketplace'}
          onClose={() => setOpenDropdown(null)}
          buttonRef={marketplaceButtonRef}
        />
      )}
    </>
  );
}