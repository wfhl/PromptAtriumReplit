import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { SidebarNav, SIDEBAR_CONTAINER_BACKGROUND } from "@/components/SidebarNav";
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  PanelLeftClose, 
  PanelLeft,
  FolderPlus,
  Lock,
  Globe,
  User as UserIcon,
  Settings,
  Users,
  DollarSign,
  LogOut,
  Moon,
  Sun,
  Shield,
  ScrollText,
  ChevronUp,
  BookOpen,
  GraduationCap,
  Image,
  Download,
  FileSearch,
  Wand2,
  Sparkles,
  Home,
  Library,
  Wrench
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { Collection, Prompt, User } from "@shared/schema";

interface CollectionsSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onCreateCollection?: () => void;
}

interface CollectionWithPrompts extends Collection {
  promptCount?: number;
}

export function CollectionsSidebar({ isOpen, onToggle, onCreateCollection }: CollectionsSidebarProps) {
  const { user, isAuthenticated } = useAuth();
  const typedUser = user as User | null;
  const [location, setLocation] = useLocation();
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);

  const { data: collections = [], isLoading: collectionsLoading } = useQuery<CollectionWithPrompts[]>({
    queryKey: ["/api/collections"],
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const toggleCollection = (collectionId: string) => {
    setExpandedCollections(prev => {
      const next = new Set(prev);
      if (next.has(collectionId)) {
        next.delete(collectionId);
      } else {
        next.add(collectionId);
      }
      return next;
    });
  };

  const handleCollectionClick = (collectionId: string) => {
    setLocation(`/collection/${collectionId}`);
  };

  const handlePromptClick = (promptId: string) => {
    setSelectedPromptId(promptId);
    setLocation(`/prompt/${promptId}`);
  };

  // Punctuation marks for visual interest
  const punctuationMarks = ["[ ]", "{x}", "~/", ".db", "_fn", ">>"];
  
  const getPunctuation = (index: number) => {
    return punctuationMarks[index % punctuationMarks.length];
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.aside
            key="sidebar"
            initial={{ x: -256 }}
            animate={{ x: 0 }}
            exit={{ x: -256 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "fixed left-0 top-16 h-[calc(100vh-4rem)] z-30 flex flex-col w-64",
              SIDEBAR_CONTAINER_BACKGROUND,
              "border-r border-white/5",
              "shadow-[inset_1px_1px_2px_rgba(255,255,255,0.03),inset_-1px_-1px_2px_rgba(0,0,0,0.6)]"
            )}
            data-testid="collections-sidebar"
            role="navigation"
            aria-label="Collections sidebar"
          >
            {/* Header with logo - matching main header */}
            <div className="px-4 pt-5 pb-4">
              <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <div className="relative">
                    <div className="absolute inset-0 bg-orange-100/20 rounded-lg blur-lg"></div>
                    <div className="w-8 h-8 relative">
                      <img 
                        src="/ATRIUM2 090725.png" 
                        alt="PromptAtrium Logo" 
                        className="w-8 h-8 object-contain relative z-10"
                      />
                    </div>
                  </div>
                  <span className="text-lg font-bold bg-gradient-to-b from-orange-400 to-purple-200 to-orange-400 bg-clip-text text-transparent">
                    PromptAtrium
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-[#a0a0a0] hover:text-white hover:bg-white/5"
                  onClick={onToggle}
                  data-testid="button-close-sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 px-4">
              <SidebarNav location={location} />

              {/* Divider */}
              <div className="h-px bg-white/[0.02] shadow-[0_1px_0_rgba(0,0,0,0.5)] mx-2 mb-4" />

              {/* Collections Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3 px-2">
                  <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[#444]">
                    Collections
                  </span>
                  {onCreateCollection && (
                    <button
                      onClick={onCreateCollection}
                      className="text-[#666] hover:text-white transition-colors p-1 rounded hover:bg-white/5"
                      title="New Collection"
                    >
                      <FolderPlus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {collectionsLoading ? (
                  <div className="space-y-2 px-2">
                    {[1, 2, 3].map((i) => (
                      <div 
                        key={i} 
                        className="h-10 bg-[#252525] rounded animate-pulse shadow-[inset_1px_1px_2px_#000]" 
                      />
                    ))}
                  </div>
                ) : collections.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <div className="w-8 h-8 mx-auto mb-3 rounded bg-[#252525] shadow-[inset_1px_1px_3px_#000] flex items-center justify-center">
                      <span className="font-mono text-[#444] text-sm">?</span>
                    </div>
                    <p className="text-xs text-[#444] font-mono">No collections</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {collections.map((collection, idx) => (
                      <CollectionFolder
                        key={collection.id}
                        collection={collection}
                        isExpanded={expandedCollections.has(collection.id)}
                        onToggle={() => toggleCollection(collection.id)}
                        onClick={() => handleCollectionClick(collection.id)}
                        onPromptClick={handlePromptClick}
                        selectedPromptId={selectedPromptId}
                        punctuation={getPunctuation(idx)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer / User Menu - matching main header dropdown */}
            <div className="border-t border-white/[0.03] p-3 mt-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center justify-between gap-3 p-2 rounded-md hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center border border-cyan-400/30 overflow-hidden">
                        {typedUser?.profileImageUrl ? (
                          <img 
                            src={typedUser.profileImageUrl} 
                            alt={typedUser.username || 'User'} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium text-white">
                            {typedUser?.firstName?.[0] || typedUser?.username?.[0]?.toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-medium text-[#ddd]">
                          {typedUser?.firstName || typedUser?.username || 'User'}
                        </span>
                        <span className="text-xs text-[#666] truncate max-w-[120px]">
                          {typedUser?.email || ''}
                        </span>
                      </div>
                    </div>
                    <ChevronUp className="h-4 w-4 text-[#666]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  side="top" 
                  align="start" 
                  className="w-56 mb-2"
                  data-testid="sidebar-user-menu"
                >
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {typedUser?.firstName ? `${typedUser.firstName} ${typedUser.lastName || ''}` : typedUser?.username || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {typedUser?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <Link href={`/user/${typedUser?.username}`} className="flex items-center cursor-pointer">
                      <UserIcon className="mr-2 h-4 w-4" />
                      View Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile/settings" className="flex items-center cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Profile Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/user/${typedUser?.username}?tab=followers`} className="flex items-center cursor-pointer">
                      <Users className="mr-2 h-4 w-4" />
                      Followers
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/user/${typedUser?.username}?tab=following`} className="flex items-center cursor-pointer">
                      <Users className="mr-2 h-4 w-4" />
                      Following
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <Link href="/seller/dashboard" className="flex items-center cursor-pointer">
                      <DollarSign className="mr-2 h-4 w-4" />
                      Start Selling
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/prompt-history" className="flex items-center cursor-pointer">
                      <FileText className="mr-2 h-4 w-4" />
                      Prompt History
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <Link href="/terms" className="flex items-center cursor-pointer">
                      <ScrollText className="mr-2 h-4 w-4" />
                      Terms & Conditions
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/privacy-policy" className="flex items-center cursor-pointer">
                      <Shield className="mr-2 h-4 w-4" />
                      Privacy Policy
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem 
                    onClick={() => window.location.href = '/api/logout'} 
                    className="cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isOpen && (
          <motion.div
            key="open-button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="fixed left-3 top-[4.5rem] z-30 h-8 w-8 bg-[#1c1c1c] border border-black/30 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.03)] hover:bg-[#252525] text-[#a0a0a0]"
              onClick={onToggle}
              data-testid="button-open-sidebar"
              aria-label="Open collections sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Collection Folder Component
interface CollectionFolderProps {
  collection: CollectionWithPrompts;
  isExpanded: boolean;
  onToggle: () => void;
  onClick: () => void;
  onPromptClick: (promptId: string) => void;
  selectedPromptId: string | null;
  punctuation: string;
}

function CollectionFolder({ 
  collection, 
  isExpanded, 
  onToggle, 
  onClick,
  onPromptClick,
  selectedPromptId,
}: CollectionFolderProps) {
  const { data: prompts = [], isLoading } = useQuery<Prompt[]>({
    queryKey: ["/api/collections", collection.id, "prompts"],
    queryFn: async () => {
      const res = await fetch(`/api/collections/${collection.id}/prompts`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch prompts");
      return res.json();
    },
    enabled: isExpanded,
    staleTime: 2 * 60 * 1000,
  });

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 rounded-sm transition-all duration-300 group",
          "text-[#a0a0a0] hover:text-white",
          isExpanded && "text-white bg-white/[0.02] shadow-[inset_2px_2px_5px_rgba(0,0,0,0.6),inset_-1px_-1px_2px_rgba(255,255,255,0.03)]"
        )}
        data-testid={`folder-collection-${collection.id}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CollapsibleTrigger asChild>
            <button
              className="p-0.5 hover:bg-white/10 rounded focus:outline-none"
              aria-label={isExpanded ? "Collapse collection" : "Expand collection"}
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 text-[#444]" />
              ) : (
                <ChevronRight className="h-3 w-3 text-[#444]" />
              )}
            </button>
          </CollapsibleTrigger>
          
          <button 
            className="flex-1 text-left font-light text-sm truncate hover:underline focus:outline-none"
            onClick={onClick}
            onKeyDown={(e) => handleKeyDown(e, onClick)}
            tabIndex={0}
          >
            {collection.name}
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          {collection.isPublic ? (
            <Globe className="h-3 w-3 text-[#444]" />
          ) : (
            <Lock className="h-3 w-3 text-[#444]" />
          )}
          <span className="font-mono text-[0.7rem] bg-[#252525] px-1.5 py-0.5 rounded-sm text-[#444] shadow-[inset_1px_1px_2px_#000]">
            {collection.promptCount || 0}
          </span>
        </div>
      </div>
      
      <CollapsibleContent>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="ml-6 pl-3 border-l border-[#333] space-y-0.5 py-2 overflow-hidden"
        >
          {isLoading ? (
            <div className="space-y-1 py-1">
              {[1, 2].map((i) => (
                <div key={i} className="h-6 bg-[#252525] rounded animate-pulse shadow-[inset_1px_1px_2px_#000]" />
              ))}
            </div>
          ) : prompts.length === 0 ? (
            <p className="text-xs text-[#444] font-mono py-1 px-2 italic">
              // empty
            </p>
          ) : (
            prompts.slice(0, 10).map((prompt) => (
              <button
                key={prompt.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-sm transition-all duration-200 w-full text-left",
                  "text-[#666] hover:text-[#a0a0a0] hover:bg-white/[0.02]",
                  selectedPromptId === prompt.id && "text-white bg-white/[0.02] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)]"
                )}
                onClick={() => onPromptClick(prompt.id)}
                onKeyDown={(e) => handleKeyDown(e, () => onPromptClick(prompt.id))}
                data-testid={`file-prompt-${prompt.id}`}
              >
                <span className="font-mono text-[#444] text-xs">~</span>
                <span className="text-xs truncate">
                  {prompt.name}
                </span>
              </button>
            ))
          )}
          {prompts.length > 10 && (
            <button 
              className="text-xs text-[#666] hover:text-[#a0a0a0] font-mono px-3 py-1 w-full text-left focus:outline-none hover:underline"
              onClick={onClick}
              onKeyDown={(e) => handleKeyDown(e, onClick)}
            >
              +{prompts.length - 10} more...
            </button>
          )}
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  );
}
