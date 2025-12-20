import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { Collection, Prompt } from "@shared/schema";

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

  const gradientClasses = [
    "from-blue-500 to-purple-600",
    "from-green-500 to-teal-600",
    "from-red-500 to-pink-600",
    "from-yellow-500 to-orange-600",
    "from-purple-500 to-indigo-600",
    "from-cyan-500 to-blue-600",
  ];

  const getGradient = (id: string) => {
    const index = Math.abs(id.charCodeAt(0)) % gradientClasses.length;
    return gradientClasses[index];
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-16 h-[calc(100vh-4rem)] bg-background/95 border-r border-border/50 z-30 transition-all duration-300 ease-in-out flex flex-col",
          isOpen ? "w-64" : "w-0"
        )}
        data-testid="collections-sidebar"
        role="navigation"
        aria-label="Collections sidebar"
      >
        {isOpen && (
          <>
            <div className="flex items-center justify-between p-3 border-b border-border/50">
              <h3 className="font-semibold text-sm text-foreground">My Collections</h3>
              <div className="flex items-center gap-1">
                {onCreateCollection && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onCreateCollection}
                    data-testid="button-create-collection-sidebar"
                  >
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onToggle}
                  data-testid="button-close-sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 px-2 py-2">
              {collectionsLoading ? (
                <div className="space-y-2 p-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-8 bg-muted/50 rounded animate-pulse" />
                  ))}
                </div>
              ) : collections.length === 0 ? (
                <div className="p-4 text-center">
                  <Folder className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">No collections yet</p>
                  {onCreateCollection && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-xs"
                      onClick={onCreateCollection}
                    >
                      <FolderPlus className="h-3 w-3 mr-1" />
                      Create Collection
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {collections.map((collection) => (
                    <CollectionFolder
                      key={collection.id}
                      collection={collection}
                      isExpanded={expandedCollections.has(collection.id)}
                      onToggle={() => toggleCollection(collection.id)}
                      onClick={() => handleCollectionClick(collection.id)}
                      onPromptClick={handlePromptClick}
                      selectedPromptId={selectedPromptId}
                      gradient={getGradient(collection.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </aside>

      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed left-3 top-[4.5rem] z-30 h-8 w-8 bg-background/90 border border-border/50 shadow-md hover:bg-accent"
          onClick={onToggle}
          data-testid="button-open-sidebar"
          aria-label="Open collections sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      )}
    </>
  );
}

interface CollectionFolderProps {
  collection: CollectionWithPrompts;
  isExpanded: boolean;
  onToggle: () => void;
  onClick: () => void;
  onPromptClick: (promptId: string) => void;
  selectedPromptId: string | null;
  gradient: string;
}

function CollectionFolder({ 
  collection, 
  isExpanded, 
  onToggle, 
  onClick,
  onPromptClick,
  selectedPromptId,
  gradient 
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
        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/50 group transition-colors"
        data-testid={`folder-collection-${collection.id}`}
      >
        <CollapsibleTrigger asChild>
          <button
            className="p-0.5 hover:bg-accent rounded focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
            aria-label={isExpanded ? "Collapse collection" : "Expand collection"}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        
        <div 
          className={cn(
            "w-5 h-5 rounded flex items-center justify-center bg-gradient-to-br",
            gradient
          )}
        >
          {isExpanded ? (
            <FolderOpen className="h-3 w-3 text-white" />
          ) : (
            <Folder className="h-3 w-3 text-white" />
          )}
        </div>
        
        <button 
          className="flex-1 text-left text-xs font-medium text-foreground truncate hover:underline focus:outline-none focus:underline"
          onClick={onClick}
          onKeyDown={(e) => handleKeyDown(e, onClick)}
          tabIndex={0}
        >
          {collection.name}
        </button>
        
        <div className="flex items-center gap-1">
          {collection.isPublic ? (
            <Globe className="h-3 w-3 text-muted-foreground" aria-label="Public collection" />
          ) : (
            <Lock className="h-3 w-3 text-muted-foreground" aria-label="Private collection" />
          )}
          <span className="text-xs text-muted-foreground" aria-label={`${collection.promptCount || 0} prompts`}>
            {collection.promptCount || 0}
          </span>
        </div>
      </div>
      
      <CollapsibleContent>
        <div className="ml-6 pl-2 border-l border-border/30 space-y-0.5 py-1">
          {isLoading ? (
            <div className="space-y-1 py-1">
              {[1, 2].map((i) => (
                <div key={i} className="h-5 bg-muted/30 rounded animate-pulse ml-2" />
              ))}
            </div>
          ) : prompts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1 px-2 italic">
              No prompts
            </p>
          ) : (
            prompts.slice(0, 10).map((prompt) => (
              <button
                key={prompt.id}
                className={cn(
                  "flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent/50 cursor-pointer transition-colors w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                  selectedPromptId === prompt.id && "bg-accent"
                )}
                onClick={() => onPromptClick(prompt.id)}
                onKeyDown={(e) => handleKeyDown(e, () => onPromptClick(prompt.id))}
                data-testid={`file-prompt-${prompt.id}`}
              >
                <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-foreground truncate">
                  {prompt.name}
                </span>
              </button>
            ))
          )}
          {prompts.length > 10 && (
            <button 
              className="text-xs text-primary cursor-pointer hover:underline px-2 py-1 w-full text-left focus:outline-none focus:underline"
              onClick={onClick}
              onKeyDown={(e) => handleKeyDown(e, onClick)}
            >
              +{prompts.length - 10} more...
            </button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
