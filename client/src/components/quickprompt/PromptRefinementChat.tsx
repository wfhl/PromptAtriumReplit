import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Send, 
  X, 
  Sparkles, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp,
  History,
  Settings,
  Trash2,
  Brain,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  refinedPrompt?: string | null;
  createdAt?: string;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  currentPrompt?: string;
  isActive: boolean;
}

interface PromptRefinementChatProps {
  currentPrompt: string;
  templateInfo?: {
    name: string;
    category: string;
  };
  onPromptRefined: (refinedPrompt: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function PromptRefinementChat({
  currentPrompt,
  templateInfo,
  onPromptRefined,
  isOpen,
  onClose,
}: PromptRefinementChatProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ['/api/prompt-refinement/conversations'],
    enabled: isOpen,
  });

  const { data: memory } = useQuery({
    queryKey: ['/api/prompt-refinement/memory'],
    enabled: isOpen,
  });

  const chatMutation = useMutation({
    mutationFn: async (data: { 
      message: string; 
      conversationId?: string; 
      currentPrompt?: string;
      templateInfo?: { name: string; category: string };
    }) => {
      return (apiRequest as any)('/api/prompt-refinement/chat', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (response: any) => {
      if (response.conversationId && !conversationId) {
        setConversationId(response.conversationId);
      }
      
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.message,
        refinedPrompt: response.refinedPrompt,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      queryClient.invalidateQueries({ queryKey: ['/api/prompt-refinement/conversations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Chat Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const learnPreferencesMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return (apiRequest as any)('/api/prompt-refinement/learn-preferences', {
        method: 'POST',
        body: JSON.stringify({ conversationId }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Preferences Updated",
        description: "Your preferences have been learned from this conversation.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/prompt-refinement/memory'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to learn preferences",
        variant: "destructive",
      });
    },
  });

  const clearMemoryMutation = useMutation({
    mutationFn: async () => {
      return (apiRequest as any)('/api/prompt-refinement/memory', {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Memory Cleared",
        description: "Your preference memory has been reset.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/prompt-refinement/memory'] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setConversationId(null);
      setMessage("");
    }
  }, [isOpen]);

  const loadConversation = async (id: string) => {
    try {
      const response = await (apiRequest as any)(`/api/prompt-refinement/conversations/${id}`);
      if (response.messages) {
        setMessages(response.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })));
        setConversationId(id);
        setShowHistory(false);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load conversation",
        variant: "destructive",
      });
    }
  };

  const handleSend = () => {
    if (!message.trim() || chatMutation.isPending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    chatMutation.mutate({
      message,
      conversationId: conversationId || undefined,
      currentPrompt: messages.length === 0 ? currentPrompt : undefined,
      templateInfo: messages.length === 0 ? templateInfo : undefined,
    });
    
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
    });
  };

  const useRefinedPrompt = (prompt: string) => {
    onPromptRefined(prompt);
    toast({
      title: "Prompt Applied",
      description: "The refined prompt has been applied to your generator.",
    });
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setMessage("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" data-testid="prompt-refinement-overlay">
      <Card className="w-full max-w-2xl h-[80vh] flex flex-col" data-testid="prompt-refinement-chat">
        <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between border-b">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Refine with AI</CardTitle>
            {conversationId && (
              <Badge variant="secondary" className="ml-2">
                <Brain className="h-3 w-3 mr-1" />
                Active Session
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={startNewConversation}
                    data-testid="button-new-conversation"
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>New Conversation</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowHistory(!showHistory)}
                    data-testid="button-toggle-history"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Conversation History</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowMemory(!showMemory)}
                    data-testid="button-toggle-memory"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Memory Settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
          {showHistory && (
            <div className="p-4 border-b bg-muted/30">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <History className="h-4 w-4" />
                Recent Conversations
              </h4>
              <ScrollArea className="h-32">
                {conversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No previous conversations</p>
                ) : (
                  <div className="space-y-2">
                    {conversations.slice(0, 5).map((conv: Conversation) => (
                      <button
                        key={conv.id}
                        onClick={() => loadConversation(conv.id)}
                        className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                        data-testid={`conversation-item-${conv.id}`}
                      >
                        <div className="font-medium text-sm truncate">{conv.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(conv.updatedAt).toLocaleDateString()}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {showMemory && (
            <div className="p-4 border-b bg-muted/30">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Your Preferences
              </h4>
              {memory ? (
                <div className="space-y-2 text-sm">
                  {(memory as any).preferredStyles?.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Styles: </span>
                      <span>{(memory as any).preferredStyles.join(', ')}</span>
                    </div>
                  )}
                  {(memory as any).preferredThemes?.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Themes: </span>
                      <span>{(memory as any).preferredThemes.join(', ')}</span>
                    </div>
                  )}
                  {(memory as any).preferredModifiers?.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Modifiers: </span>
                      <span>{(memory as any).preferredModifiers.join(', ')}</span>
                    </div>
                  )}
                  {(memory as any).avoidedTerms?.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Avoided: </span>
                      <span className="text-destructive">{(memory as any).avoidedTerms.join(', ')}</span>
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => clearMemoryMutation.mutate()}
                      disabled={clearMemoryMutation.isPending}
                      data-testid="button-clear-memory"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear Memory
                    </Button>
                    {conversationId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => learnPreferencesMutation.mutate(conversationId)}
                        disabled={learnPreferencesMutation.isPending}
                        data-testid="button-learn-preferences"
                      >
                        <Brain className="h-3 w-3 mr-1" />
                        Learn from This
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No preferences saved yet. Chat with the AI to build your preference profile!</p>
              )}
            </div>
          )}

          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-lg mb-2">Start Refining Your Prompt</h3>
                <p className="text-muted-foreground text-sm max-w-md mb-4">
                  Chat with AI to refine and improve your prompt. Ask for specific styles, 
                  adjustments, or let the AI suggest improvements based on your preferences.
                </p>
                {currentPrompt && (
                  <div className="bg-muted rounded-lg p-3 text-sm max-w-md">
                    <span className="text-muted-foreground">Current prompt: </span>
                    <span className="line-clamp-2">{currentPrompt}</span>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMessage("Make this more cinematic and dramatic")}
                    data-testid="suggestion-cinematic"
                  >
                    Make it cinematic
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMessage("Add more detail to the lighting and atmosphere")}
                    data-testid="suggestion-lighting"
                  >
                    Improve lighting
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMessage("Make it more artistic and stylized")}
                    data-testid="suggestion-artistic"
                  >
                    More artistic
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-3 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      
                      {msg.refinedPrompt && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-4 w-4 text-amber-500" />
                            <span className="text-xs font-medium">Refined Prompt</span>
                          </div>
                          <div className="bg-background/80 rounded p-2 text-sm">
                            {msg.refinedPrompt}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => copyToClipboard(msg.refinedPrompt!, msg.id)}
                              data-testid={`button-copy-refined-${msg.id}`}
                            >
                              {copiedId === msg.id ? (
                                <Check className="h-3 w-3 mr-1" />
                              ) : (
                                <Copy className="h-3 w-3 mr-1" />
                              )}
                              Copy
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => useRefinedPrompt(msg.refinedPrompt!)}
                              data-testid={`button-use-refined-${msg.id}`}
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              Use This
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {chatMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          <div className="p-4 border-t bg-background">
            <div className="flex gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask for refinements, style changes, or improvements..."
                className="flex-1 min-h-[60px] max-h-[120px] resize-none"
                disabled={chatMutation.isPending}
                data-testid="input-chat-message"
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim() || chatMutation.isPending}
                className="self-end"
                data-testid="button-send-message"
              >
                {chatMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function RefineWithAIButton({
  currentPrompt,
  templateInfo,
  onPromptRefined,
}: {
  currentPrompt: string;
  templateInfo?: { name: string; category: string };
  onPromptRefined: (prompt: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
        disabled={!currentPrompt}
        data-testid="button-refine-with-ai"
      >
        <MessageCircle className="h-4 w-4" />
        Refine with AI
      </Button>

      <PromptRefinementChat
        currentPrompt={currentPrompt}
        templateInfo={templateInfo}
        onPromptRefined={(prompt) => {
          onPromptRefined(prompt);
        }}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
