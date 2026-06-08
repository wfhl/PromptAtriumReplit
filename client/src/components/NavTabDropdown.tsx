import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Wrench, Users, ShoppingBag, ChevronRight, Sparkles, TrendingUp, Clock, Heart, FileSearch, FolderPlus, RatioIcon, BookOpen, Plus, FileUp, Globe, Lock } from 'lucide-react';
import { CommunityContextTabs } from '@/components/CommunityContextTabs';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import type { Community, UserCommunity } from '@shared/schema';

interface TabOption {
  label: string;
  tab: string;
  icon?: React.ComponentType<any>;
}

interface NavTabDropdownProps {
  page: 'library' | 'tools' | 'community' | 'marketplace';
  isOpen: boolean;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLElement>;
}

const PAGE_CONFIGS = {
  library: {
    path: '/library',
    icon: FileText,
    title: 'Prompts',
    tabs: [
      { label: 'My Prompts', tab: 'prompts' },
      { label: 'Bookmarks', tab: 'bookmarked' },
      { label: 'Collections', tab: 'collections' },
      { label: 'Archive', tab: 'archive' }
    ]
  },
  tools: {
    path: '/tools',
    icon: Wrench,
    title: 'Tools',
    tabs: [
      { label: 'Add Prompt', tab: 'add-prompt', icon: Plus },
      { label: 'Generate Prompt', tab: 'quick-prompter', icon: Sparkles },
      { label: 'Import Prompts', tab: 'import', icon: FileUp },
      { label: 'Metadata Extract', tab: 'metadata-analyzer', icon: FileSearch },
      { label: 'Collections', tab: 'collections', icon: FolderPlus },
      { label: 'Aspect Ratio Calc', tab: 'aspect-ratio-calculator', icon: RatioIcon },
      { label: 'Wordsmith Codex', tab: 'codex', icon: BookOpen },
      { label: 'Prompting Guides', tab: 'prompting-guides', icon: BookOpen },
    ]
  },
  community: {
    path: '/community',
    icon: Users,
    title: 'Community',
    tabs: [
      { label: 'Featured Prompts', tab: 'prompts&sub=featured', icon: Sparkles },
      { label: 'All Prompts', tab: 'prompts&sub=all' },
      { label: 'Trending Prompts', tab: 'prompts&sub=trending', icon: TrendingUp },
      { label: 'Recent Prompts', tab: 'prompts&sub=recent', icon: Clock },
      { label: 'Collections', tab: 'collections' },
      { label: 'Following', tab: 'followed', icon: Heart }
    ]
  },
  marketplace: {
    path: '/marketplace',
    icon: ShoppingBag,
    title: 'Marketplace',
    tabs: [] // Marketplace uses filters, not tabs
  }
};

export function NavTabDropdown({ page, isOpen, onClose, buttonRef }: NavTabDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ bottom: number; left: number; width: number }>({
    bottom: 0,
    left: 0,
    width: 0
  });
  const [location, setLocation] = useLocation();
  // Initialize selectedCommunityId from URL
  const currentParams = new URLSearchParams(location.includes('?') ? location.split('?')[1] : '');
  const urlCommunityId = currentParams.get('communityId');
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(urlCommunityId);
  const { user } = useAuth();

  // Fetch user's communities for community page
  const { data: userCommunities = [] } = useQuery<UserCommunity[]>({
    queryKey: ["/api/user/communities"],
    enabled: !!user && page === 'community',
  });

  // Fetch all communities to get the details
  const { data: allCommunities = [] } = useQuery<Community[]>({
    queryKey: ["/api/communities"],
    enabled: !!user && userCommunities.length > 0 && page === 'community',
  });

  // Filter to get user's private communities
  const privateCommunities = allCommunities.filter(c => 
    c.slug !== 'global' && 
    c.slug !== 'general' &&
    userCommunities.some(uc => 
      uc.communityId === c.id && 
      (uc.status === 'accepted' || !uc.status)
    )
  );

  const config = PAGE_CONFIGS[page];
  const Icon = config.icon;

  // Update selectedCommunityId when URL changes
  useEffect(() => {
    const params = new URLSearchParams(location.includes('?') ? location.split('?')[1] : '');
    const communityId = params.get('communityId');
    setSelectedCommunityId(communityId);
  }, [location]);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      setPosition({
        bottom: viewportHeight - rect.top + 8, // 8px gap above button
        left: rect.left,
        width: rect.width
      });
    }
  }, [isOpen, buttonRef]);

  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (event: MouseEvent | TouchEvent) => {
        if (
          dropdownRef.current && 
          !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current &&
          !buttonRef.current.contains(event.target as Node)
        ) {
          onClose();
        }
      };

      // Add delay to prevent immediate close on touch devices
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [isOpen, onClose, buttonRef]);

  // Don't render dropdown for pages without tabs
  if (config.tabs.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/20 lg:hidden"
            onClick={onClose}
          />
          
          {/* Dropdown */}
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed z-[70] lg:hidden"
            style={{
              bottom: `${position.bottom}px`,
              left: `${position.left}px`,
              width: `${Math.max(position.width, 180)}px`,
            }}
          >
            <div className={`backdrop-blur-xl rounded-lg shadow-2xl overflow-hidden select-none border-2 ${
              page === 'library' ? 'bg-gradient-to-br from-purple-600/95 to-pink-600/95 border-purple-400/40 shadow-purple-500/50' :
              page === 'tools' ? 'bg-gradient-to-br from-blue-600/95 to-cyan-600/95 border-blue-400/40 shadow-blue-500/50' :
              page === 'community' ? 'bg-gradient-to-br from-purple-600/95 to-indigo-600/95 border-purple-400/40 shadow-purple-500/50' :
              'bg-gradient-to-br from-orange-600/95 to-red-600/95 border-orange-400/40 shadow-orange-500/50'
            }`}>
              {/* Header */}
              <div className={`flex items-center gap-2 px-3 py-2 border-b ${
                page === 'library' ? 'border-purple-400/20 bg-purple-900/30' :
                page === 'tools' ? 'border-blue-400/20 bg-blue-900/30' :
                page === 'community' ? 'border-purple-400/20 bg-purple-900/30' :
                'border-orange-400/20 bg-orange-900/30'
              }`}>
                <Icon className="h-4 w-4 text-white/90" />
                <span className="text-sm font-medium text-white">{config.title} - Quick Jump</span>
              </div>
              
              {/* Community Context Selection for Community Page */}
              {page === 'community' && privateCommunities.length > 0 && (
                <div className="p-2 border-b border-purple-400/20">
                  <div className="text-xs text-white/70 font-medium mb-2 px-2">Select Community</div>
                  
                  {/* Global Community */}
                  <div
                    onClick={() => {
                      setSelectedCommunityId(null);
                      setLocation('/community');
                      onClose();
                    }}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                      !selectedCommunityId 
                        ? 'bg-white/20 text-white' 
                        : 'hover:bg-white/10 text-white/80 hover:text-white'
                    }`}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span className="text-sm">Global</span>
                    {!selectedCommunityId && (
                      <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />
                    )}
                  </div>

                  {/* Private Communities */}
                  {privateCommunities.map((community) => {
                    const membership = userCommunities.find(uc => uc.communityId === community.id);
                    const isAdmin = membership?.role === 'admin';
                    
                    return (
                      <div
                        key={community.id}
                        onClick={() => {
                          setSelectedCommunityId(community.id);
                          setLocation(`/community?communityId=${community.id}`);
                          onClose();
                        }}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                          selectedCommunityId === community.id 
                            ? 'bg-white/20 text-white' 
                            : 'hover:bg-white/10 text-white/80 hover:text-white'
                        }`}
                      >
                        <Lock className="h-3.5 w-3.5" />
                        <span className="text-sm truncate flex-1">{community.name}</span>
                        {isAdmin && (
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">Admin</span>
                        )}
                        {selectedCommunityId === community.id && (
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Tab Options */}
              <div className="py-1 max-h-[60vh] overflow-y-auto">
                {config.tabs.map((tab) => {
                  const TabIcon = (tab as any).icon;
                  
                  // Generate the appropriate href based on the page type
                  let href = '';
                  if (page === 'tools') {
                    // Tools have specific routing patterns
                    switch (tab.tab) {
                      case 'add-prompt':
                        href = '/library?action=new-prompt';
                        break;
                      case 'quick-prompter':
                        href = '/tools/quick-prompter';
                        break;
                      case 'import':
                        href = '/library?action=import';
                        break;
                      case 'metadata-analyzer':
                        href = '/tools/metadata-analyzer';
                        break;
                      case 'collections':
                        href = '/collections';
                        break;
                      case 'aspect-ratio-calculator':
                        href = '/tools/aspect-ratio-calculator';
                        break;
                      case 'codex':
                        href = '/codex';
                        break;
                      case 'prompting-guides':
                        href = '/prompting-guides';
                        break;
                      default:
                        href = '/tools';
                    }
                  } else {
                    // Other pages use tab parameters
                    // Preserve communityId if we're on the community page
                    if (page === 'community') {
                      const currentParams = new URLSearchParams(location.includes('?') ? location.split('?')[1] : '');
                      const currentCommunityId = currentParams.get('communityId');
                      const newParams = new URLSearchParams();
                      newParams.set('tab', tab.tab);
                      if (currentCommunityId) {
                        newParams.set('communityId', currentCommunityId);
                      }
                      href = `${config.path}?${newParams.toString()}`;
                    } else {
                      href = `${config.path}?tab=${tab.tab}`;
                    }
                  }
                  
                  return (
                    <div
                      key={tab.tab}
                      onClick={() => {
                        // For community page prompts sub-tabs, save to localStorage
                        if (page === 'community' && tab.tab.startsWith('prompts&sub=')) {
                          const subTab = tab.tab.split('sub=')[1];
                          localStorage.setItem('community-prompts-sub-tab', subTab);
                        }
                        // For library tabs, save to localStorage
                        if (page === 'library' && tab.tab) {
                          localStorage.setItem('library-active-tab', tab.tab);
                        }
                        
                        // Always use client-side routing for smooth transitions
                        setLocation(href);
                        
                        // Close dropdown immediately
                        onClose();
                      }}
                      className="flex items-center justify-between px-3 py-2.5 hover:bg-white/20 transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        {TabIcon && <TabIcon className="h-3 w-3 text-white/70 group-hover:text-white" />}
                        <span className="text-sm text-white group-hover:text-white font-medium">
                          {tab.label}
                        </span>
                      </div>
                      <ChevronRight className="h-3 w-3 text-white/50 group-hover:text-white/80 transition-all duration-200" />
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}