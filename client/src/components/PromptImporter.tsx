import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Upload, 
  Link as LinkIcon, 
  Sparkles, 
  ChevronDown, 
  ChevronUp,
  X,
  Loader2,
  Check,
  Download,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { fetchSocialContext, fileToBase64, getPlatformIcon, type SocialContext } from "@/lib/socialMediaUtils";

interface ExtractedPrompt {
  prompt: string | any;
  name: string;
  tags: string[];
  promptType: string;
  promptStyle: string;
  intendedModel: string;
  slideIndex?: number;
}

interface ExtractionResult {
  analysis: string;
  items: ExtractedPrompt[];
  method: 'direct' | 'reconstructed' | 'failed';
}

interface PromptImporterProps {
  onPromptSaved?: () => void;
}

export function PromptImporter({ onPromptSaved }: PromptImporterProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [textContext, setTextContext] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [socialContext, setSocialContext] = useState<SocialContext | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [savedItems, setSavedItems] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchContext = async () => {
      if (!url || url.length < 10) return;
      if (socialContext?.originalUrl === url) return;

      setIsLoadingContext(true);
      try {
        const context = await fetchSocialContext(url);
        if (isMounted && context) {
          setSocialContext(context);
        }
      } catch (e) {
        console.error("Context fetch error", e);
      } finally {
        if (isMounted) setIsLoadingContext(false);
      }
    };

    const timer = setTimeout(fetchContext, 1000);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [url, socialContext?.originalUrl]);

  const processFiles = (files: File[]) => {
    setMediaFiles(files);
    previewUrls.forEach(u => URL.revokeObjectURL(u));
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setPreviewUrls(newPreviews);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      processFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files) as File[];
      processFiles(files);
    }
  };

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const mediaData: { base64: string; mimeType: string }[] = [];
      for (const file of mediaFiles) {
        const base64 = await fileToBase64(file);
        mediaData.push({ base64, mimeType: file.type });
      }

      const response = await apiRequest("POST", "/api/prompts/extract", {
        url,
        textContext,
        mediaData,
        socialContext,
      });

      return response.json() as Promise<ExtractionResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      setSavedItems(new Set());
      if (data.method === 'failed') {
        toast({
          title: "Extraction Failed",
          description: data.analysis || "Could not extract prompts from the provided content.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Analysis Complete",
          description: `Found ${data.items.length} prompt${data.items.length !== 1 ? 's' : ''}`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const savePromptMutation = useMutation({
    mutationFn: async ({ item, index }: { item: ExtractedPrompt; index: number }) => {
      // Collect image URLs - either from uploaded files or social context
      const imageUrls: string[] = [];
      let uploadFailed = false;

      // Try to upload local file if available
      if (item.slideIndex !== undefined && item.slideIndex >= 0 && item.slideIndex < mediaFiles.length) {
        const file = mediaFiles[item.slideIndex];
        try {
          const uploadUrlResponse = await apiRequest("POST", "/api/objects/upload");
          if (!uploadUrlResponse.ok) {
            throw new Error("Failed to get upload URL");
          }
          const { uploadURL, publicURL, objectPath } = await uploadUrlResponse.json();
          
          // Upload the file to the signed URL
          const uploadResult = await fetch(uploadURL, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          });
          
          if (!uploadResult.ok) {
            throw new Error("Upload failed");
          }
          
          // Use the permanent URL (prefer publicURL, fallback to objectPath)
          const savedUrl = publicURL || objectPath;
          if (savedUrl) {
            imageUrls.push(savedUrl);
          }
        } catch (uploadError) {
          console.error("Failed to upload image to storage:", uploadError);
          uploadFailed = true;
        }
      }
      
      // Add external URLs from social context (only valid http/https URLs)
      if (socialContext?.thumbnail && socialContext.thumbnail.startsWith('http')) {
        if (!imageUrls.includes(socialContext.thumbnail)) {
          imageUrls.push(socialContext.thumbnail);
        }
      }
      if (socialContext?.mediaUrls && socialContext.mediaUrls.length > 0) {
        const validUrls = socialContext.mediaUrls.filter(u => 
          u && u.startsWith('http') && !imageUrls.includes(u)
        );
        imageUrls.push(...validUrls.slice(0, 4));
      }

      // Generate a brief description (not the full prompt content)
      const generateDescription = (): string => {
        if (socialContext?.title) return socialContext.title;
        if (socialContext?.text) return socialContext.text.slice(0, 200);
        if (item.promptType) return `${item.promptType} prompt imported from ${socialContext?.platform || 'upload'}`;
        return `Imported from ${socialContext?.platform || 'file upload'}`;
      };

      // Build the final prompt data - use AI-generated name from extraction
      const promptData = {
        name: item.name || 'Imported Prompt',
        promptContent: typeof item.prompt === 'string' ? item.prompt : JSON.stringify(item.prompt, null, 2),
        description: generateDescription(),
        category: item.promptType || "General",
        promptType: item.promptType,
        promptStyle: item.promptStyle,
        tags: item.tags || [],
        sourceUrl: url || undefined,
        intendedGenerator: item.intendedModel,
        exampleImagesUrl: imageUrls,
        author: socialContext?.author || undefined,
        isPublic: false,
        status: "draft",
        additionalMetadata: {
          platform: socialContext?.platform || 'manual_upload',
          extractionMethod: result?.method || 'direct',
          slideIndex: item.slideIndex,
          timestamp: Date.now()
        }
      };

      await apiRequest("POST", "/api/prompts", promptData);
      return { index, uploadFailed, hasImages: imageUrls.length > 0 };
    },
    onSuccess: (result) => {
      setSavedItems(prev => new Set(prev).add(result.index));
      // Invalidate all prompts-related queries including Recent Prompts
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/prompts');
        }
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      
      if (result.uploadFailed && !result.hasImages) {
        toast({
          title: "Prompt Saved",
          description: "Saved without image (upload failed)",
          variant: "default",
        });
      } else {
        toast({
          title: "Prompt Saved",
          description: result.hasImages ? "Added with image to your library" : "Added to your library",
        });
      }
      onPromptSaved?.();
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Could not save prompt",
        variant: "destructive",
      });
    },
  });

  const handleSaveAll = async () => {
    if (!result) return;
    for (let i = 0; i < result.items.length; i++) {
      if (!savedItems.has(i)) {
        await savePromptMutation.mutateAsync({ item: result.items[i], index: i });
      }
    }
  };

  const clearAll = () => {
    setUrl("");
    setTextContext("");
    setMediaFiles([]);
    previewUrls.forEach(u => URL.revokeObjectURL(u));
    setPreviewUrls([]);
    setResult(null);
    setSocialContext(null);
    setSavedItems(new Set());
  };

  const canAnalyze = url || mediaFiles.length > 0 || textContext;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-purple-500/5">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-purple-500">
                  <Download className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Prompt Importer</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Extract AI prompts from social media posts and images
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Post URL
                  </label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://instagram.com/p/..."
                      className="pl-9"
                    />
                    {isLoadingContext && (
                      <div className="absolute right-3 top-2.5">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports Twitter/X, Reddit, YouTube, Instagram, TikTok
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Additional Context (Optional)
                  </label>
                  <Textarea
                    value={textContext}
                    onChange={(e) => setTextContext(e.target.value)}
                    placeholder="Paste caption, description, or specific details here..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Media Upload (Optional)
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg min-h-[6rem] p-4 flex flex-col justify-center items-center cursor-pointer transition group ${
                      isDragging
                        ? 'border-primary bg-primary/10'
                        : 'border-muted-foreground/30 hover:border-primary hover:bg-accent/50'
                    }`}
                  >
                    {previewUrls.length > 0 ? (
                      <div className={`grid gap-2 w-full ${previewUrls.length > 1 ? 'grid-cols-4' : 'grid-cols-1'}`}>
                        {previewUrls.slice(0, 4).map((src, i) => (
                          <div key={i} className="relative aspect-square rounded-md overflow-hidden border border-border">
                            <img src={src} alt={`Slide ${i+1}`} className="w-full h-full object-cover" />
                            <div className="absolute bottom-0 right-0 bg-black/60 text-[10px] text-white px-1">{i+1}</div>
                          </div>
                        ))}
                        {previewUrls.length > 4 && (
                          <div className="flex items-center justify-center bg-muted text-muted-foreground text-xs rounded-md border border-border">
                            +{previewUrls.length - 4} more
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-xs text-muted-foreground text-center mt-2">
                          {isDragging ? 'Drop files to upload' : 'Upload screenshots or carousel images'}
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/*"
                      multiple
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {socialContext && (
                  <div className="rounded-lg bg-accent/50 border border-border overflow-hidden">
                    <div className="flex items-center gap-2 p-3 border-b border-border">
                      <span className="text-lg">{getPlatformIcon(socialContext.platform)}</span>
                      <span className="font-medium capitalize">{socialContext.platform}</span>
                      {socialContext.author && (
                        <span className="text-sm text-muted-foreground">by {socialContext.author}</span>
                      )}
                      {url && (
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-auto text-primary hover:text-primary/80"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    
                    {/* Render iframe embed for YouTube/Instagram/Twitter */}
                    {socialContext.html || socialContext.platform === 'twitter' ? (
                      <div className="w-full bg-white dark:bg-[#15181c] rounded-md overflow-hidden">
                        {socialContext.platform === 'twitter' ? (
                          <div className="p-4 border border-border/50">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                {socialContext.author?.[0] || 'X'}
                              </div>
                              <div>
                                <div className="font-bold text-sm text-foreground">{socialContext.author || 'User'}</div>
                                <div className="text-xs text-muted-foreground">@{socialContext.originalUrl?.split('/')?.slice(-3, -2)?.[0] || 'xuser'}</div>
                              </div>
                              <div className="ml-auto">
                                <span className="text-xl">𝕏</span>
                              </div>
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-wrap mb-4 leading-relaxed">
                              {socialContext.text || socialContext.title}
                            </p>
                            {socialContext.mediaUrls && socialContext.mediaUrls.length > 0 && (
                              <div className={`grid gap-2 rounded-xl overflow-hidden ${socialContext.mediaUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {socialContext.mediaUrls.slice(0, 4).map((mediaUrl, i) => (
                                  <img 
                                    key={i}
                                    src={mediaUrl} 
                                    alt={`Tweet media ${i+1}`} 
                                    className="w-full h-full object-cover max-h-60"
                                  />
                                ))}
                              </div>
                            )}
                            <div className="mt-3 pt-3 border-t border-border/30 flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              <span>•</span>
                              <span>{new Date().toLocaleDateString([], {month: 'short', day: 'numeric', year: 'numeric'})}</span>
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="w-full"
                            dangerouslySetInnerHTML={{ __html: socialContext.html || '' }}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="p-3">
                        {socialContext.title && (
                          <p className="text-sm text-foreground line-clamp-2 mb-2">{socialContext.title}</p>
                        )}
                        {socialContext.text && socialContext.text !== socialContext.title && (
                          <p className="text-xs text-muted-foreground line-clamp-3 mb-2">{socialContext.text}</p>
                        )}
                        {/* Show thumbnail for Twitter/Reddit (no iframe) */}
                        {socialContext.thumbnail && (
                          <img 
                            src={socialContext.thumbnail} 
                            alt="Preview" 
                            className="rounded-md max-h-40 object-cover"
                          />
                        )}
                        {/* Show gallery for Reddit multi-image posts */}
                        {!socialContext.thumbnail && socialContext.mediaUrls && socialContext.mediaUrls.length > 0 && (
                          <div className={`grid gap-2 ${socialContext.mediaUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {socialContext.mediaUrls.slice(0, 4).map((mediaUrl, i) => (
                              <img 
                                key={i}
                                src={mediaUrl} 
                                alt={`Media ${i+1}`} 
                                className="rounded-md max-h-32 w-full object-cover"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {result && result.items.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Extracted Prompts ({result.items.length})</h4>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleSaveAll}
                          disabled={savePromptMutation.isPending || savedItems.size === result.items.length}
                        >
                          {savePromptMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Check className="h-3 w-3 mr-1" />
                          )}
                          Save All
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {result.items.map((item, i) => (
                        <div 
                          key={i} 
                          className={`p-3 rounded-lg border ${
                            savedItems.has(i) ? 'bg-green-500/10 border-green-500/30' : 'bg-card border-border'
                          }`}
                        >
                          {/* Header with name and save button */}
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-sm text-foreground truncate pr-2">
                              {item.name || 'Imported Prompt'}
                            </h5>
                            <Button
                              size="sm"
                              variant={savedItems.has(i) ? "ghost" : "default"}
                              onClick={() => savePromptMutation.mutate({ item, index: i })}
                              disabled={savePromptMutation.isPending || savedItems.has(i)}
                              className="shadow-md shrink-0"
                            >
                              {savedItems.has(i) ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                "Save"
                              )}
                            </Button>
                          </div>
                          {/* Prompt content */}
                          <div className="text-sm font-mono text-xs bg-muted p-3 rounded border border-border/50 max-h-[200px] overflow-auto">
                            {(() => {
                              try {
                                const parsed = typeof item.prompt === 'string' ? JSON.parse(item.prompt) : item.prompt;
                                return (
                                  <pre className="text-xs whitespace-pre-wrap break-words">
                                    {JSON.stringify(parsed, null, 2)}
                                  </pre>
                                );
                              } catch (e) {
                                return <span className="whitespace-pre-wrap break-words">{typeof item.prompt === 'object' ? JSON.stringify(item.prompt, null, 2) : item.prompt}</span>;
                              }
                            })()}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.promptType && (
                              <Badge variant="secondary" className="text-xs">{item.promptType}</Badge>
                            )}
                            {item.intendedModel && (
                              <Badge variant="outline" className="text-xs">{item.intendedModel}</Badge>
                            )}
                            {item.tags?.slice(0, 3).map((tag, j) => (
                              <Badge key={j} variant="outline" className="text-xs opacity-70">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result && result.method === 'failed' && (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-center">
                    <p className="text-sm text-destructive">{result.analysis}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending || !canAnalyze}
                className="flex-1"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Extract Prompts
                  </>
                )}
              </Button>
              {(url || mediaFiles.length > 0 || textContext || result) && (
                <Button variant="outline" onClick={clearAll}>
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
