import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sparkles, Copy, Link, ExternalLink, FileText, Camera, Film, Brush, Crown, UserCircle, Share, Palette, Share2, Dices, Save, Plus, ImageIcon, X, ChevronRight, ChevronDown, Eye, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link as WouterLink } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShareToLibraryModal } from "./ShareToLibraryModal";
import { apiRequest } from "@/lib/queryClient";
import { useCreateCharacterPreset } from "@/hooks/quickprompt/use-presets";
import { useAuth } from "@/hooks/useAuth";
import { useAdminMode } from "./AdminModeContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RefineWithAIButton } from "./PromptRefinementChat";

// Rule templates will be fetched from database and sorted in required order

export default function QuickPromptPlay() {
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [character, setCharacter] = useState("");
  const [template, setTemplate] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGeneratedSection, setShowGeneratedSection] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [jsonPromptData, setJsonPromptData] = useState<{[key: string]: string[]} | null>(null);
  const [sparklePopoverOpen, setSparklePopoverOpen] = useState(false);
  const [customCharacterInput, setCustomCharacterInput] = useState("");
  const [showCustomCharacterInput, setShowCustomCharacterInput] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [progressVisible, setProgressVisible] = useState<boolean>(false);
  const [selectedVisionModel, setSelectedVisionModel] = useState('custom-vision'); // Default to custom vision server
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [debugReport, setDebugReport] = useState<any[]>([]);
  const [showDebugReport, setShowDebugReport] = useState(false);
  const [imageAnalysisResponse, setImageAnalysisResponse] = useState<string>('');
  const [selectedSocialTone, setSelectedSocialTone] = useState<string>('casual');
  const [showImageAnalysis, setShowImageAnalysis] = useState(false);
  
  // Social media caption states
  const [socialMediaCaption, setSocialMediaCaption] = useState<string>('');
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [showSocialCaption, setShowSocialCaption] = useState(false);

  
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { isAdminMode } = useAdminMode();
  
  // Fetch character presets from database
  const { data: characterPresets = [] } = useQuery({
    queryKey: ['/api/system-data/character-presets'],
    select: (data: any[]) => {
      if (!data || !Array.isArray(data)) return [];
      
      return data
        .map(preset => ({
          id: preset.id.toString(),
          name: preset.name,
          description: `${preset.gender || 'Character'} - ${preset.role || preset.description || 'Custom character'}`,
          isFavorite: preset.is_favorite || false,
          isCustom: true
        }))
        .sort((a, b) => {
          // Sort by favorite status first (favorites come first)
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
          
          // Then sort alphabetically by name
          return a.name.localeCompare(b.name);
        });
    }
  });

  // Fetch prompt library categories for share modal
  const { data: promptCategories = [] } = useQuery({
    queryKey: ['/api/system-data/prompt-library/categories'],
    select: (data: any[]) => {
      if (!data || !Array.isArray(data)) return [];
      return data.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description || ''
      }));
    }
  });

  // Fetch enhanced rule templates from database
  const { data: dbRuleTemplates = [] } = useQuery({
    queryKey: ['/api/system-data/prompt-templates'],
    select: (data: any[]) => {
      if (!data || !Array.isArray(data)) return [];
      
      // Get appropriate icon for each template type
      const getTemplateIcon = (templateType: string, templateName: string) => {
        const name = templateName.toLowerCase();
        const type = templateType.toLowerCase();
        
        if (name.includes('photography') || name.includes('photo')) return Camera;
        if (name.includes('artistic') || name.includes('art')) return Palette;
        if (name.includes('cinematic') || name.includes('director')) return Film;
        if (name.includes('style') || name.includes('enhancer')) return Brush;
        if (name.includes('glamour') || name.includes('beauty')) return Sparkles;
        if (name.includes('luxury') || name.includes('lifestyle')) return Crown;
        if (name.includes('portrait') || name.includes('beauty')) return UserCircle;
        if (name.includes('social') || name.includes('engagement')) return Share;
        
        // Fallback based on category
        if (type.includes('photography')) return Camera;
        if (type.includes('artistic')) return Palette;
        if (type.includes('cinematic')) return Film;
        if (type.includes('style')) return Brush;
        if (type.includes('glamour')) return Sparkles;
        if (type.includes('lifestyle')) return Crown;
        if (type.includes('beauty')) return UserCircle;
        if (type.includes('engagement')) return Share;
        
        return FileText; // Default icon
      };
      
      // Map templates with enhanced properties
      const mappedTemplates = data.map(template => ({
        id: template.id,
        template_id: template.template_id,
        name: template.name,
        description: template.template || template.description || `${template.template_type} enhancement`,
        template_type: template.template_type,
        master_prompt: template.master_prompt,
        llm_provider: template.llm_provider,
        llm_model: template.llm_model,
        use_happy_talk: template.use_happy_talk,
        compress_prompt: template.compress_prompt,
        compression_level: template.compression_level,
        icon: getTemplateIcon(template.template_type, template.name)
      }));
      
      // Sort with enhanced templates first, then alphabetically
      return mappedTemplates.sort((a, b) => {
        // Prioritize our new enhanced templates
        const enhancedTemplates = ['photo_master_v1', 'artistic_vision_v1', 'cinematic_director_v1', 'style_enhancer_v1', 'influencer_glamour_v1', 'lifestyle_luxury_v1', 'beauty_portrait_v1', 'social_engagement_v1'];
        const aIsEnhanced = enhancedTemplates.includes(a.template_id);
        const bIsEnhanced = enhancedTemplates.includes(b.template_id);
        
        if (aIsEnhanced && !bIsEnhanced) return -1;
        if (!aIsEnhanced && bIsEnhanced) return 1;
        
        return a.name.localeCompare(b.name);
      });
    }
  });

  // Load JSON prompt data
  useEffect(() => {
    const loadJsonPromptData = async () => {
      try {
        const response = await fetch('/data/jsonprompthelper.json', {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setJsonPromptData(data);
        }
      } catch (error) {
        console.error('Failed to load JSON prompt data:', error);
      }
    };

    loadJsonPromptData();
  }, []);

  // Initialize template selection with persistence and default to pipeline
  useEffect(() => {
    if (dbRuleTemplates.length > 0 && !template) {
      // Get saved template from localStorage
      const savedTemplate = localStorage.getItem('quickPrompt-selectedTemplate');
      
      if (savedTemplate) {
        // Check if saved template still exists in the list
        const templateExists = dbRuleTemplates.find(t => t.id.toString() === savedTemplate);
        if (templateExists) {
          setTemplate(savedTemplate);
          return;
        }
      }
      
      // Default to pipeline template if no saved selection or saved template doesn't exist
      const pipelineTemplate = dbRuleTemplates.find(t => 
        t.template_id === 'pipeline_174' || 
        t.name.toLowerCase().includes('pipeline') ||
        t.template_type === 'pipeline'
      );
      
      if (pipelineTemplate) {
        setTemplate(pipelineTemplate.id.toString());
      } else if (dbRuleTemplates.length > 0) {
        // Fallback to first template if pipeline not found
        setTemplate(dbRuleTemplates[0].id.toString());
      }
    }
  }, [dbRuleTemplates, template]);

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setUploadedImage(file);
      
      // Don't clear the image analysis, just collapse it
      setShowImageAnalysis(false);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Removed toast notification for cleaner UX
    }
    // Removed error toast notification for cleaner UX
  };

  // Handle image removal
  const handleRemoveImage = () => {
    setUploadedImage(null);
    setImagePreview(null);
    setImageAnalysisResponse('');
    setShowImageAnalysis(false);
    setSocialMediaCaption('');
    setShowSocialCaption(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Social media caption generation with different tones
  const handleGenerateSocialCaption = async (tone: string) => {
    if (!uploadedImage || !imagePreview) {
      toast({
        title: "No image uploaded",
        description: "Please upload an image first",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingCaption(true);
    
    // Define tone-specific prompts for social media captions
    const tonePrompts = {
      professional: "Generate a professional, business-appropriate social media caption for this image. Keep it concise (1-2 sentences), include relevant hashtags, and maintain a polished tone suitable for LinkedIn or corporate accounts.",
      casual: "Create a casual, friendly social media caption for this image. Use a conversational tone like you're talking to friends, keep it light and relatable, perfect for Instagram or Facebook posts.",
      funny: "Write a humorous, witty social media caption for this image. Use humor, puns, or clever observations to make people smile or laugh. Keep it entertaining and shareable.",
      inspirational: "Generate an inspiring, motivational social media caption for this image. Focus on positive messaging, encouragement, or life lessons. Include relevant motivational hashtags.",
      trendy: "Create a trendy, Gen Z style social media caption for this image. Use current slang, trending phrases, and a modern voice that resonates with younger audiences.",
      storytelling: "Write a storytelling social media caption for this image. Create a brief narrative or share an interesting backstory that engages viewers and encourages comments.",
      engaging: "Generate an engaging, question-based social media caption for this image. Ask viewers questions to encourage interaction, comments, and engagement with the post.",
      direct: "Create a direct, action-oriented social media caption for this image. Include clear call-to-actions and be straightforward about what you want viewers to do (like, share, comment, visit, etc.)."
    };

    try {
      const response = await fetch('/api/caption/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imagePreview,
          model: 'gpt-4o',
          captionStyle: 'Social Media',
          customPrompt: tonePrompts[tone as keyof typeof tonePrompts] || tonePrompts.casual
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate caption');
      }

      const data = await response.json();
      const caption = data.caption || data.analysis || '';
      
      setSocialMediaCaption(caption);
      setShowSocialCaption(true);
      
      toast({
        title: "Caption generated",
        description: `${tone.charAt(0).toUpperCase() + tone.slice(1)} style caption created successfully`,
      });
      
    } catch (error) {
      console.error('Error generating social media caption:', error);
      toast({
        title: "Generation failed",
        description: "Could not generate social media caption. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  // Handle template changes with persistence
  const handleTemplateChange = (value: string) => {
    setTemplate(value);
    localStorage.setItem('quickPrompt-selectedTemplate', value);
  };

  // Handle JSON prompt category selection
  const handleJsonPromptSelection = (category: string) => {
    if (!jsonPromptData || !jsonPromptData[category]) return;
    
    const prompts = jsonPromptData[category];
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    setSubject(randomPrompt);
    setSparklePopoverOpen(false);
    
    toast({
      title: "Subject filled",
      description: `Random prompt from "${category.replace(/_/g, ' ')}" category`,
    });
  };

  // Handle random category selection
  const handleRandomCategorySelection = () => {
    if (!jsonPromptData) return;
    
    const categories = Object.keys(jsonPromptData);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const prompts = jsonPromptData[randomCategory];
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    
    setSubject(randomPrompt);
    setSparklePopoverOpen(false);
    
    toast({
      title: "Subject filled",
      description: `Random prompt from random "${randomCategory.replace(/_/g, ' ')}" category`,
    });
  };

  // Handle random character selection
  const handleRandomCharacter = () => {
    if (characterPresets.length === 0) return;
    
    const randomCharacter = characterPresets[Math.floor(Math.random() * characterPresets.length)];
    setCharacter(randomCharacter.id);
    
    // Removed toast notification for cleaner UX
  };

  // Handle random template selection
  const handleRandomTemplate = () => {
    if (dbRuleTemplates.length === 0) return;
    
    const randomTemplate = dbRuleTemplates[Math.floor(Math.random() * dbRuleTemplates.length)];
    setTemplate(randomTemplate.id.toString());
    localStorage.setItem('quickPrompt-selectedTemplate', randomTemplate.id.toString());
    
    // Removed toast notification for cleaner UX
  };

  // Handle custom character save
  const handleSaveCustomCharacter = () => {
    if (!customCharacterInput.trim()) {
      // Removed toast notification for cleaner UX
      return;
    }

    // Check authentication first
    if (!isAuthenticated) {
      // Just use the custom character without saving
      setCharacter('custom');
      return;
    }

    // Extract a name from the description (first few words)
    const words = customCharacterInput.trim().split(' ');
    const characterName = words.slice(0, 3).join(' '); // Use first 3 words as name
    
    // Create complete character preset data structure
    saveCharacterMutation.mutate({
      preset_id: characterName.toLowerCase().replace(/\s+/g, '-'),
      name: characterName,
      gender: 'female', // Default
      body_type: '',
      default_tag: '',
      role: '',
      hairstyle: '',
      hair_color: '',
      eye_color: '',
      makeup: '',
      skin_tone: '',
      clothing: '',
      expression: '',
      jewelry: '',
      accessories: '',
      pose: '',
      additional_details: '',
      lora_description: customCharacterInput.trim(), // Use user input as lora_description
      is_custom: true,
      created_by: 'dev-user',
      character_data: {
        gender: 'female',
        bodyType: '',
        characterType: '',
        defaultTag: '',
        role: '',
        hairstyle: '',
        hairColor: '',
        eyeColor: '',
        makeup: '',
        skinTone: '',
        clothing: '',
        expression: '',
        jewelry: '',
        accessories: '',
        pose: '',
        additionalDetails: '',
        loraDescription: customCharacterInput.trim() // Also in character_data
      }
    } as any);
  };

  // Handle character selection change to show/hide custom input
  const handleCharacterChange = (value: string) => {
    setCharacter(value);
    setShowCustomCharacterInput(value === "custom-character");
  };

  // Mutation for saving prompt to user library
  const saveToUserLibraryMutation = useMutation({
    mutationFn: (promptData: any) => apiRequest('/api/prompts', 'POST', promptData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/prompts'] });
      toast({
        title: "Prompt saved",
        description: "Added to your personal library",
      });
    },
    onError: () => {
      toast({
        title: "Save failed",
        description: "Could not save prompt to library",
        variant: "destructive",
      });
    }
  });

  // Mutation for saving prompt to history
  const saveToHistoryMutation = useMutation({
    mutationFn: async (historyData: any) => {
      console.log('About to save to history with:', historyData);
      try {
        const result = await apiRequest('/api/prompt-history', 'POST', historyData);
        console.log('Successfully saved to history:', result);
        return result;
      } catch (err: any) {
        console.error('Error saving to history - full error:', err);
        console.error('Error message:', err?.message);
        console.error('Error response:', err?.response);
        throw err;
      }
    },
    onSuccess: (data) => {
      console.log('History save successful:', data);
      // Invalidate the prompt history query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/prompt-history'] });
    },
    onError: (error: any) => {
      console.error('Failed to save to prompt history - onError:', error);
      console.error('Error details:', error?.message, error?.response);
      // Silent failure - we don't want to interrupt the user experience
    }
  });

  // Enhanced mutation for saving to user library with navigation toast
  const enhancedSaveToUserLibraryMutation = useMutation({
    mutationFn: (promptData: any) => apiRequest('/api/prompts', 'POST', promptData),
    onSuccess: (savedPrompt: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/prompts'] });
      setShareModalOpen(false);
      
      const ToastLink = () => (
        <a 
          href={`/prompts/${savedPrompt.id}`} 
          className="font-medium underline underline-offset-4 hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          View Prompt →
        </a>
      );
      
      toast({
        title: "✓ Prompt saved to your library!",
        description: (
          <div className="flex flex-col gap-1">
            <span>Your prompt "{savedPrompt.name}" has been saved.</span>
            <ToastLink />
          </div>
        )
      });
    },
    onError: () => {
      toast({
        title: "Save failed",
        description: "Could not save prompt to your library",
        variant: "destructive",
      });
    }
  });

  // Character preset mutation with custom success/error handling
  const createCharacterPresetMutation = useCreateCharacterPreset();
  const saveCharacterMutation = useMutation({
    mutationFn: createCharacterPresetMutation.mutateAsync,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/character-presets'] });
      setCustomCharacterInput("");
      setShowCustomCharacterInput(false);
      setCharacter(data.id.toString());
      toast({
        title: "Character saved",
        description: "Custom character added to your presets",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save character preset",
        variant: "destructive",
      });
    },
  });

  const handleGeneratePrompt = async () => {
    // Special handling for vision-only template
    if (template === 'vision-only') {
      if (!uploadedImage) {
        toast({
          title: "Image required",
          description: "Please upload an image for vision analysis",
          variant: "destructive",
        });
        return;
      }
      
      setIsGenerating(true);
      setProgressVisible(true);
      setProcessingStage('🔍 Analyzing image...');
      
      try {
        const visionResponse = await fetch('/api/caption/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: imagePreview,
            model: selectedVisionModel,
            captionStyle: 'Descriptive',
            customPrompt: 'Analyze this image and provide a detailed description. Include: subject, setting, lighting, composition, style, mood, colors, and any notable details.'
          }),
        });
        
        if (visionResponse.ok) {
          const visionData = await visionResponse.json();
          const analysis = visionData.caption || visionData.analysis || '';
          const cleanedAnalysis = analysis.replace(/<\/s><s>/g, '').replace(/<s>/g, '').replace(/<\/s>/g, '');
          setImageAnalysisResponse(cleanedAnalysis);
          setShowImageAnalysis(true);
          setGeneratedPrompt(''); // Clear any previous prompt
          setShowGeneratedSection(false); // Hide the generated section
          toast({
            title: "Image analysis complete",
            description: "View the analysis results below",
          });
        } else {
          throw new Error('Failed to analyze image');
        }
      } catch (error) {
        console.error('Vision analysis error:', error);
        toast({
          title: "Analysis failed",
          description: "Could not analyze the image",
          variant: "destructive",
        });
      } finally {
        setIsGenerating(false);
        setProgressVisible(false);
        setProcessingStage('');
      }
      return;
    }
    
    // Special handling for social-caption template
    if (template === 'social-caption') {
      if (!uploadedImage) {
        toast({
          title: "Image required",
          description: "Please upload an image to generate a social media caption",
          variant: "destructive",
        });
        return;
      }
      
      setIsGenerating(true);
      setProgressVisible(true);
      setProcessingStage('✍️ Generating social media caption...');
      
      try {
        await handleGenerateSocialCaption(selectedSocialTone);
        setShowGeneratedSection(false); // Hide the normal generated section
        setShowSocialCaption(true); // Show social caption section
      } catch (error) {
        console.error('Social caption error:', error);
        toast({
          title: "Caption generation failed",
          description: "Could not generate social media caption",
          variant: "destructive",
        });
      } finally {
        setIsGenerating(false);
        setProgressVisible(false);
        setProcessingStage('');
      }
      return;
    }
    
    // Normal template handling
    if (!subject && !uploadedImage) {
      toast({
        title: "Input required",
        description: "Please enter a subject or upload an image",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setProgressVisible(true);

    try {

    // Initialize the subject - will be filled from text input or image analysis
    let effectiveSubject = subject;

    // Stage 1: If image is provided, analyze it first to get the subject
    if (uploadedImage && imagePreview) {
      try {
        // Show progress for Stage 1
        setProcessingStage('🔍 Analyzing image with vision model...');
        setProgressVisible(true);
        
        // Get image caption using vision API
        const visionRequestPayload = {
          image: imagePreview,
          model: selectedVisionModel,
          captionStyle: 'Descriptive',
          prompt: 'Analyze this image and provide a detailed description suitable for AI image generation. Include: subject, setting, lighting, composition, style, mood, and any notable details.',
          customPrompt: 'Analyze this image and provide a detailed description suitable for AI image generation. Include: subject, setting, lighting, composition, style, mood, and any notable details.'
        };

        // Debug logging for vision API call
        console.log('🔍 Frontend Debug - Vision API Call:');
        console.log('Vision Model:', selectedVisionModel);
        console.log('Vision Request Payload:', JSON.stringify(visionRequestPayload, null, 2));

        const captionResponse = await fetch('/api/caption/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(visionRequestPayload),
        });

        if (!captionResponse.ok) {
          const errorData = await captionResponse.json();
          console.error('Caption API error:', errorData);
          throw new Error(errorData.error || 'Failed to analyze image');
        }

        const captionData = await captionResponse.json();
        console.log('Caption API response:', captionData);
        
        // Capture debug report from caption API
        if (captionData.debugReport) {
          setDebugReport(captionData.debugReport);
        }
        
        let imageCaption = captionData.caption || captionData.analysis || '';
        
        // Store the raw image analysis response and clean it
        const cleanedCaption = imageCaption.replace(/<\/s><s>/g, '').replace(/<s>/g, '').replace(/<\/s>/g, '');
        setImageAnalysisResponse(cleanedCaption);
        
        // Check if GPT-4 refused the request (before cleaning)
        const isRefusal = imageCaption.toLowerCase().includes("i'm sorry") || 
                         imageCaption.toLowerCase().includes("i can't") ||
                         imageCaption.toLowerCase().includes("i cannot") ||
                         imageCaption.toLowerCase().includes("unable to assist");
        
        if (isRefusal) {
          console.log('GPT-4 refused, triggering Joy-Caption fallback');
          setProcessingStage('🔄 Using fallback: Joy-Caption Beta');
          
          // Make a new request with Joy-Caption model
          const fallbackResponse = await fetch('/api/caption/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: imagePreview,
              model: selectedVisionModel,
              captionStyle: 'Descriptive',
              prompt: 'Analyze this image and provide a detailed description suitable for AI image generation.',
              customPrompt: 'Analyze this image and provide a detailed description suitable for AI image generation.'
            }),
          });
          
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            imageCaption = fallbackData.caption || fallbackData.analysis || '';
            const cleanedFallbackCaption = imageCaption.replace(/<\/s><s>/g, '').replace(/<s>/g, '').replace(/<\/s>/g, '');
            setImageAnalysisResponse(cleanedFallbackCaption); // Store fallback response too
            console.log('Joy-Caption fallback response:', imageCaption);
            
            // Update stage to show fallback was successful
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        // Check if fallback was used
        if (captionData.metadata?.usedFallback) {
          setProcessingStage(`🔄 Using fallback: ${captionData.metadata.fallbackModel}`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause to show fallback message
        }
        
        // Extract useful description if vision API includes safety disclaimers
        if (imageCaption.includes('However, I can analyze')) {
          const parts = imageCaption.split('However, I can analyze');
          if (parts.length > 1) {
            imageCaption = parts[1].trim();
          }
        }
        
        // Remove any remaining disclaimers
        imageCaption = imageCaption
          .replace(/I'm unable to identify[^.]+\./g, '')
          .replace(/I'm sorry[^.]+\./g, '')
          .replace(/I can't help[^.]+\./g, '')
          .replace(/the visual elements[:\s]*/gi, '') // Remove "the visual elements:" prefix
          .trim();
        
        console.log('Cleaned caption:', imageCaption);
        
        // If caption is still empty after cleaning, use a generic description
        if (!imageCaption) {
          imageCaption = 'A detailed scene that requires artistic interpretation';
        }
        
        // Use the cleaned image description as the subject
        effectiveSubject = imageCaption;
        
      } catch (error) {
        console.error('Error analyzing image:', error);
        setProgressVisible(false);
        setProcessingStage('');
        toast({
          title: 'Image Analysis Failed',
          description: 'Could not analyze the image. Please try again.',
          variant: 'destructive',
        });
        throw new Error('Image analysis failed');
      }
    }

    // Stage 2: Build the prompt with character and subject
    let basePrompt = effectiveSubject;
    
    // Check if we have an image and need to format differently
    if (imagePreview && imageAnalysisResponse) {
      // Get the character description if provided
      let characterDescription = '';
      if (character && character !== 'no-character') {
        if (character === 'custom-character') {
          characterDescription = customCharacterInput.trim();
        } else {
          const selectedCharacter = characterPresets.find(preset => preset.id === character);
          if (selectedCharacter) {
            characterDescription = selectedCharacter.description || selectedCharacter.name || '';
          } else if (character === "character") {
            characterDescription = "character";
          }
        }
      }
      
      // Format prompt based on input combinations
      if (characterDescription && !subject) {
        // Character + Image (NO Subject)
        basePrompt = `please apply the following character description: ${characterDescription} to the following image description: ${imageAnalysisResponse}`;
      } else if (characterDescription && subject) {
        // Subject + Character + Image
        basePrompt = `please apply the following character description: ${characterDescription}, and subject details: ${subject} to the following image description: ${imageAnalysisResponse}`;
      } else if (!characterDescription && subject) {
        // Subject + Image (NO Character)
        basePrompt = `please apply the following subject details: ${subject} to the following image description: ${imageAnalysisResponse}`;
      }
      // else: Just Image (no character, no subject) - use the image analysis as-is
      
    } else {
      // Original logic when no image is present
      if (character && character !== 'no-character') {
        if (character === 'custom-character') {
          // Use custom character input
          if (customCharacterInput.trim()) {
            basePrompt = `${customCharacterInput.trim()}, ${basePrompt}`;
          }
        } else {
          const selectedCharacter = characterPresets.find(preset => preset.id === character);
          if (selectedCharacter) {
            basePrompt = `${selectedCharacter.name}, ${basePrompt}`;
          } else if (character === "character") {
            basePrompt = `character, ${basePrompt}`;
          }
        }
      }
    }

    // Find selected template (skip for special templates)
    const selectedTemplate = dbRuleTemplates.find(t => t.id.toString() === template);
    
    if (!selectedTemplate) {
      setGeneratedPrompt(basePrompt);
      
      // Save to prompt history
      saveToHistoryMutation.mutate({
        promptText: basePrompt,
        templateUsed: 'No Template',
        settings: {
          subject: subject,
          character: character,
        },
        metadata: {
          subject: subject,
          character: character === 'custom-character' ? customCharacterInput : 
                    // Handle legacy custom-TIMESTAMP IDs from localStorage
                    (character && character.startsWith('custom-') && /^custom-\d+$/.test(character)) ? 'Custom Character' :
                    characterPresets.find(p => p.id === character)?.name || character,
          hasImage: !!imagePreview,
          socialMediaTone: selectedSocialTone,
        },
        isSaved: false
      });
      
      toast({
        title: "Prompt generated",
        description: "Basic prompt has been generated",
      });
      return; // Exit handled by finally block
    }

    // Check if this template has AI enhancement capabilities (master_prompt)
    if (selectedTemplate.master_prompt && selectedTemplate.master_prompt.trim()) {
      try {
        // CRITICAL: Ensure we always send the master prompt from database
        if (!selectedTemplate.master_prompt || selectedTemplate.master_prompt.length < 10) {
          toast({
            title: "Template Error",
            description: `Template "${selectedTemplate.name}" missing master prompt data`,
            variant: "destructive",
          });
          throw new Error(`Template "${selectedTemplate.name}" missing master prompt data`);
        }

        // Get complete character data to send
        let characterData = '';
        if (character && character !== 'no-character') {
          if (character === 'custom-character' && customCharacterInput.trim()) {
            characterData = customCharacterInput.trim();
          } else {
            const selectedCharacter = characterPresets.find(preset => preset.id === character);
            if (selectedCharacter) {
              // Send full character description instead of just name/ID
              characterData = selectedCharacter.description || selectedCharacter.name || '';
            }
          }
        }

        // Build enhancement request with the complete prompt
        const enhancementRequest: any = {
          prompt: basePrompt,
          llmProvider: selectedTemplate.llm_provider,
          llmModel: selectedTemplate.llm_model,
          useHappyTalk: selectedTemplate.use_happy_talk,
          compressPrompt: selectedTemplate.compress_prompt,
          compressionLevel: selectedTemplate.compression_level,
          customBasePrompt: selectedTemplate.master_prompt,
          templateId: selectedTemplate.id.toString(), // Send template ID for proper template handling
          debugReport: debugReport, // Pass the debug report from vision analysis
          subject: subject, // Pass subject for replacement instructions
          character: characterData // Pass complete character data for replacement instructions
        };

        // Debug logging to verify system prompt is correct
        console.log('🔍 Frontend Debug - Template Selection:');
        console.log('Selected Template ID:', selectedTemplate.id);
        console.log('Selected Template Name:', selectedTemplate.name);
        console.log('Master Prompt Length:', selectedTemplate.master_prompt?.length || 0);
        console.log('Master Prompt Preview:', selectedTemplate.master_prompt?.substring(0, 100) + '...');
        console.log('Full Master Prompt:', selectedTemplate.master_prompt);

        // No need to handle image separately here - we already processed it above

        // Show progress for Stage 2
        const templateName = selectedTemplate.name || 'Prompt Style';
        setProcessingStage(`🎨 Applying ${templateName} formatting...`);
        
        const response = await fetch('/api/enhance-prompt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(enhancementRequest),
        });

        if (response.ok) {
          const result = await response.json();
          setGeneratedPrompt(result.enhancedPrompt);
          
          // Save to prompt history
          const selectedTemplateData = dbRuleTemplates.find(t => t.id.toString() === template);
          saveToHistoryMutation.mutate({
            promptText: result.enhancedPrompt,
            templateUsed: selectedTemplateData?.name || 'Unknown Template',
            settings: {
              llmProvider: selectedTemplate.llm_provider,
              llmModel: selectedTemplate.llm_model,
              subject: subject,
              character: character,
            },
            metadata: {
              subject: subject,
              character: character === 'custom-character' ? customCharacterInput : 
                        characterPresets.find(p => p.id === character)?.name || character,
              hasImage: !!imagePreview,
              socialMediaTone: selectedSocialTone,
              templateId: template,
            },
            isSaved: false
          });
          
          // Combine debug reports from both stages
          if (result.debugReport) {
            // Merge vision analysis debug report with template processing debug report
            const combinedDebugReport = [...debugReport, ...result.debugReport];
            setDebugReport(combinedDebugReport);
          }
          
          // Success case - enhanced prompt generated
        } else {
          const errorData = await response.json();
          console.error('Enhance API error:', errorData);
          throw new Error(errorData.error || 'Enhancement failed');
        }
      } catch (enhancementError) {
        console.error('Error enhancing prompt:', enhancementError);
        setGeneratedPrompt(basePrompt);
        
        // Save fallback prompt to history
        saveToHistoryMutation.mutate({
          promptText: basePrompt,
          templateUsed: selectedTemplate.name || 'Unknown Template',
          settings: {
            subject: subject,
            character: character,
            llmProvider: selectedTemplate.llm_provider,
            llmModel: selectedTemplate.llm_model,
          },
          metadata: {
            subject: subject,
            character: character === 'custom-character' ? customCharacterInput : 
                      // Handle legacy custom-TIMESTAMP IDs from localStorage
                      (character && character.startsWith('custom-') && /^custom-\d+$/.test(character)) ? 'Custom Character' :
                      characterPresets.find(p => p.id === character)?.name || character,
            hasImage: !!imagePreview,
            socialMediaTone: selectedSocialTone,
            templateId: template,
            fallback: true
          },
          isSaved: false
        });
        // Error handled gracefully, no need to show error toast
      }
    } else {
      // Use basic template processing for legacy templates
      setGeneratedPrompt(basePrompt);
      
      // Save legacy template prompt to history
      saveToHistoryMutation.mutate({
        promptText: basePrompt,
        templateUsed: selectedTemplate.name || 'Legacy Template',
        settings: {
          subject: subject,
          character: character,
        },
        metadata: {
          subject: subject,
          character: character === 'custom-character' ? customCharacterInput : 
                    // Handle legacy custom-TIMESTAMP IDs from localStorage
                    (character && character.startsWith('custom-') && /^custom-\d+$/.test(character)) ? 'Custom Character' :
                    characterPresets.find(p => p.id === character)?.name || character,
          hasImage: !!imagePreview,
          socialMediaTone: selectedSocialTone,
          templateId: template,
          legacy: true
        },
        isSaved: false
      });
    }
    } catch (globalError) {
      console.error('Error in handleGeneratePrompt:', globalError);
      toast({
        title: "Generation failed",
        description: "Unable to generate prompt. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Always reset loading states
      setIsGenerating(false);
      setProgressVisible(false);
      setProcessingStage('');
    }
  };

  const handleCopyPrompt = () => {
    if (!generatedPrompt) return;
    
    navigator.clipboard.writeText(generatedPrompt);
    // Removed toast notification for cleaner UX
  };

  return (
    <Card className="h-full bg-gradient-to-br from-purple-600/10 to-blue-600/10 border-red-500/00 hover:bg-red-500/00 border-red-500/00 overflow-y-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">Quick Prompt</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Inputs */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="subject" className="text-sm text-gray-400">Subject</Label>
                {jsonPromptData && (
                  <Popover open={sparklePopoverOpen} onOpenChange={setSparklePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-gray-800/50 overflow-y-auto no-scrollbar transition-all duration-300"
                      >
                        <Sparkles className="h-4 w-4 text-pink-400" style={{
                          filter: 'drop-shadow(0 0 1px #8b5cf6)'
                        }} />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2 bg-gradient-to-br from-purple-600/10 to-blue-600/10 border-red-500/00 hover:bg-red-500/00 border-gray-700" align="start">
                      <div className="space-y-1">
                        <div className="text-xs text-gray-400 font-medium mb-2 px-2">
                          Fill Subject with Random Prompt
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {/* Random Choice Option */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-left text-white hover:bg-gradient-to-br from-purple-600/10 to-blue-600/10 h-auto py-2 px-2 border-b border-gray-700 mb-1"
                            onClick={handleRandomCategorySelection}
                          >
                            <div className="flex items-center space-x-2">
                              <Dices className="h-4 w-4 text-pink-400" style={{
                                filter: 'drop-shadow(0 0 1px #8b5cf6)'
                              }} />
                              <div className="flex flex-col items-start">
                                <span className="text-sm font-medium text-pink-400">
                                  Random Choice
                                </span>
                                <span className="text-xs text-gray-400">
                                  Pick any random category
                                </span>
                              </div>
                            </div>
                          </Button>
                          
                          {/* Category Options */}
                          {Object.keys(jsonPromptData).map((category) => (
                            <Button
                              key={category}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-left text-white hover:bg-gray-800 h-auto py-2 px-2"
                              onClick={() => handleJsonPromptSelection(category)}
                            >
                              <div className="flex flex-col items-start">
                                <span className="text-sm font-medium">
                                  {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {jsonPromptData[category]?.length || 0} prompts
                                </span>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <Input
                id="subject"
                placeholder="Try clicking on the pink sparkles for random inspiration?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-gray-800/50 border-gray-700"
              />
            </div>

            {/* Image Upload Section - Minimal and Mobile-friendly */}
            <div className="space-y-2">
              <Label className="text-sm text-gray-400">Image (Optional)</Label>
              <div className="flex items-center gap-2">
                {!imagePreview ? (
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gradient-to-br from-purple-700/50 to-purple-900/50 border border-gray-700 rounded-md cursor-pointer hover:bg-gray-800/70 transition-colors"
                    >
                      <ImageIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-400/70">Upload Image</span>
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1">
                    <div className="relative h-10 w-10 rounded overflow-hidden border border-gray-700">
                      <img 
                        src={imagePreview} 
                        alt="Uploaded" 
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="text-sm text-gray-400 truncate flex-1">Image uploaded</span>
                    {/* Caption dropdown temporarily hidden */}
                    {/* <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isGeneratingCaption}
                          className="h-8 px-2 hover:bg-gray-800/50 text-xs text-blue-400 hover:text-blue-300"
                        >
                          <Camera className="h-3 w-3 mr-1" />
                          {isGeneratingCaption ? 'Generating...' : 'Caption'}
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-gray-800 border-gray-700">
                        <DropdownMenuItem 
                          onClick={() => handleGenerateSocialCaption('professional')}
                          disabled={isGeneratingCaption}
                          className="text-gray-300 hover:bg-gray-700 cursor-pointer"
                        >
                          Professional
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleGenerateSocialCaption('casual')}
                          disabled={isGeneratingCaption}
                          className="text-gray-300 hover:bg-gray-700 cursor-pointer"
                        >
                          Casual & Friendly
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleGenerateSocialCaption('funny')}
                          disabled={isGeneratingCaption}
                          className="text-gray-300 hover:bg-gray-700 cursor-pointer"
                        >
                          Funny & Witty
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleGenerateSocialCaption('inspirational')}
                          disabled={isGeneratingCaption}
                          className="text-gray-300 hover:bg-gray-700 cursor-pointer"
                        >
                          Inspirational
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleGenerateSocialCaption('trendy')}
                          disabled={isGeneratingCaption}
                          className="text-gray-300 hover:bg-gray-700 cursor-pointer"
                        >
                          Trendy & Gen Z
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleGenerateSocialCaption('storytelling')}
                          disabled={isGeneratingCaption}
                          className="text-gray-300 hover:bg-gray-700 cursor-pointer"
                        >
                          Storytelling
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleGenerateSocialCaption('engaging')}
                          disabled={isGeneratingCaption}
                          className="text-gray-300 hover:bg-gray-700 cursor-pointer"
                        >
                          Engaging & Questions
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleGenerateSocialCaption('direct')}
                          disabled={isGeneratingCaption}
                          className="text-gray-300 hover:bg-gray-700 cursor-pointer"
                        >
                          Direct & Action
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu> */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveImage}
                      className="h-8 w-8 p-0 hover:bg-gray-800/50"
                    >
                      <X className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                )}
              </div>

            </div>

            {/* Social Media Caption Display */}
            {showSocialCaption && socialMediaCaption && (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-medium text-gray-300">Social Media Caption</span>
                      <Badge variant="secondary" className="text-xs">
                        Ready to share
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-gray-700/50"
                      onClick={() => {
                        navigator.clipboard.writeText(socialMediaCaption);
                        toast({
                          title: "Copied",
                          description: "Caption copied to clipboard",
                        });
                      }}
                    >
                      <Copy className="h-3 w-3 text-gray-400" />
                    </Button>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-lg p-3 relative">
                    <div className="text-sm text-gray-300 whitespace-pre-wrap">
                      {socialMediaCaption}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-gray-700 bg-gray-800/50 text-blue-400 hover:bg-gray-800 hover:text-blue-300"
                      onClick={async () => {
                        if (navigator.share) {
                          try {
                            await navigator.share({
                              title: 'Social Media Caption',
                              text: socialMediaCaption,
                            });
                          } catch (err) {
                            console.log('Share cancelled');
                          }
                        } else {
                          navigator.clipboard.writeText(socialMediaCaption);
                          toast({
                            title: "Copied to clipboard",
                            description: "Caption has been copied to your clipboard"
                          });
                        }
                      }}
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                      onClick={() => {
                        setSocialMediaCaption('');
                        setShowSocialCaption(false);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Vision Model Selection - Hidden but preserved for future use */}
            {false && imagePreview && (
              <div className="space-y-2">
                <Label className="text-sm text-gray-400">Vision Model</Label>
                <Select value={selectedVisionModel} onValueChange={setSelectedVisionModel}>
                  <SelectTrigger className="bg-gray-800/50 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="fancyfeast/joy-caption-beta-one">Joy-Caption Beta</SelectItem>
                    <SelectItem value="custom-vision">Custom Vision Server</SelectItem>
                    <SelectItem value="gpt4-vision">GPT-4 Vision</SelectItem>
                    <SelectItem value="florence-2">Florence-2</SelectItem>
                  </SelectContent>
                </Select>
                {selectedVisionModel === 'custom-vision' && (
                  <p className="text-xs text-amber-500">Using local Florence-2 server via ngrok</p>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="character" className="text-sm text-gray-400">Character</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-gradient-to-br from-purple-600/10 to-blue-600/10 border-red-500/00 hover:bg-red-500/00 transition-all duration-300"
                  onClick={handleRandomCharacter}
                  disabled={characterPresets.length === 0}
                >
                  <Dices className="h-4 w-4 text-pink-400" style={{
                    filter: 'drop-shadow(0 0 1px #8b5cf6)'
                  }} />
                </Button>
              </div>
              <Select value={character} onValueChange={handleCharacterChange}>
                <SelectTrigger id="character" className="bg-gradient-to-br from-purple-600/10 to-blue-600/10">
                  <SelectValue placeholder="Select a character" />
                </SelectTrigger>
                <SelectContent className="bg-gradient-to-br from-purple-900/30 to-blue-900/10 border-gray-700">
                  <SelectItem value="no-character">No Character</SelectItem>
                  <SelectItem value="custom-character">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-green-400" />
                      Custom Character
                    </div>
                  </SelectItem>
                  {/* Display database character presets with favorites first */}
                  {characterPresets.length > 0 && (
                    <>
                      <SelectItem value="separator-presets" disabled>
                        --- Character Presets ---
                      </SelectItem>
                      {characterPresets.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.isFavorite ? "♥ " : ""}{preset.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              
              {/* Custom Character Input Field */}
              {showCustomCharacterInput && (
                <div className="mt-3 space-y-2">
                  <Label className="text-sm text-gray-400">Custom Character Description</Label>
                  <div className="relative">
                    <Input
                      value={customCharacterInput}
                      onChange={(e) => setCustomCharacterInput(e.target.value)}
                      placeholder="Describe your custom character..."
                      className="bg-gray-800/50 border-gray-700"

                    />

                  </div>
                  <p className="text-xs text-gray-500">
                    Enter a custom character description for your prompt
                  </p>
                </div>
              )}
            </div>
            

            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="template" className="text-sm text-gray-400">Prompt Style Template</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-gray-800/50 transition-all duration-300"
                  onClick={handleRandomTemplate}
                  disabled={dbRuleTemplates.length === 0}
                >
                  <Dices className="h-4 w-4 text-pink-400" style={{
                    filter: 'drop-shadow(0 0 1px #8b5cf6)'
                  }} />
                </Button>
              </div>
              <Select value={template} onValueChange={handleTemplateChange}>
                <SelectTrigger id="template" className="bg-gradient-to-br from-purple-600/10 to-blue-600/10 border-gray-700">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent className="bg-gradient-to-br from-purple-900/30 to-blue-900/10 border-gray-700">
                  {/* Special Options */}
                  <SelectItem value="vision-only">
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4" />
                      <span>Image Vision Analysis Only</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="social-caption">
                    <div className="flex items-center space-x-2">
                      <Camera className="h-4 w-4" />
                      <span>Social Media Post Caption</span>
                    </div>
                  </SelectItem>
                  <div className="my-1 border-t border-gray-700" />
                  {/* Regular Templates */}
                  {dbRuleTemplates.map((template) => {
                    const IconComponent = template.icon;
                    return (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        <div className="flex items-center space-x-2">
                          <IconComponent className="h-4 w-4" />
                          <span>{template.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Tone selector for Social Media Caption template */}
            {template === 'social-caption' && (
              <div className="space-y-2">
                <Label className="text-sm text-gray-400">Tone</Label>
                <Select value={selectedSocialTone} onValueChange={setSelectedSocialTone}>
                  <SelectTrigger className="bg-gradient-to-br from-purple-600/10 to-blue-600/10 border-gray-700">
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent className="bg-gradient-to-br from-purple-900/30 to-blue-900/10 border-gray-700">
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="funny">Funny</SelectItem>
                    <SelectItem value="inspirational">Inspirational</SelectItem>
                    <SelectItem value="trendy">Trendy & Gen Z</SelectItem>
                    <SelectItem value="storytelling">Storytelling</SelectItem>
                    <SelectItem value="engaging">Engaging & Questions</SelectItem>
                    <SelectItem value="direct">Direct & Action</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <Button 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold" 
              onClick={() => {
                setShowGeneratedSection(true);
                handleGeneratePrompt();
              }}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enhancing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4 text-white" />
                  Generate Enhanced Prompt
                </>
              )}
            </Button>
          </div>
          
          {/* Right Column - Output (conditionally rendered) */}
          {showGeneratedSection && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="generated-prompt" className="text-sm text-gray-400">Generated Prompt</Label>
                  {generatedPrompt && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-primary-400 hover:text-primary-300"
                      onClick={handleCopyPrompt}
                    >
                      <Copy className="h-3 w-3 mr-1" /> Copy
                    </Button>
                  )}
                </div>
                <div className="relative min-h-[160px] bg-gray-800/30 rounded-md border border-gray-700 p-3">
                  {progressVisible && processingStage ? (
                    <div className="text-sm text-gray-400 flex flex-col items-center justify-center h-full animate-pulse">
                      <div className="mb-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
                      </div>
                      <p className="text-center font-medium">{processingStage}</p>
                    </div>
                  ) : generatedPrompt ? (
                    <div className="text-sm text-gray-300 whitespace-pre-wrap">
                      {generatedPrompt}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 flex flex-col items-center justify-center h-full">
                      <FileText className="h-8 w-8 mb-2 opacity-30" />
                      <p>Prompt will appear here</p>
                      <p className="text-xs">Fill in the form and click Generate</p>
                    </div>
                  )}
                </div>
              </div>
            
              {generatedPrompt && (
                <div className="flex flex-col space-y-2 pt-1">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-gray-700 bg-gray-800/50 text-primary-400 hover:bg-gray-800 hover:text-primary-300"
                      onClick={async () => {
                        if (navigator.share) {
                          try {
                            await navigator.share({
                              title: 'Generated Prompt',
                              text: generatedPrompt,
                            });
                          } catch (err) {
                            console.log('Share cancelled');
                          }
                        } else {
                          navigator.clipboard.writeText(generatedPrompt);
                          toast({
                            title: "Copied to clipboard",
                            description: "Prompt has been copied to your clipboard"
                          });
                        }
                      }}
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-gray-700 bg-gray-800/50 text-green-400 hover:bg-gray-800 hover:text-green-300"
                      onClick={() => setShareModalOpen(true)}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save Prompt
                    </Button>
                  </div>
                  {isAuthenticated && (
                    <RefineWithAIButton
                      currentPrompt={generatedPrompt}
                      templateInfo={dbRuleTemplates.find(t => t.id.toString() === template) ? {
                        name: dbRuleTemplates.find(t => t.id.toString() === template)!.name,
                        category: dbRuleTemplates.find(t => t.id.toString() === template)!.template_type || 'General'
                      } : undefined}
                      onPromptRefined={(refinedPrompt) => {
                        setGeneratedPrompt(refinedPrompt);
                        toast({
                          title: "Prompt Refined",
                          description: "Your prompt has been updated with the AI refinement."
                        });
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>

      {/* Share to Library Modal */}
      {generatedPrompt && (
        <ShareToLibraryModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          promptData={{
            id: 0, // Temporary ID for new prompt
            name: subject ? `Quick Prompt: ${subject.slice(0, 30)}${subject.length > 30 ? '...' : ''}` : 'Quick Prompt',
            positive_prompt: generatedPrompt,
            negative_prompt: '',
            tags: [subject, character === 'no-character' ? null : character].filter(Boolean) as string[],
            template_name: dbRuleTemplates.find(t => t.id.toString() === template)?.name,
            character_preset: (character === 'no-character' ? null : character) as any
          }}
          onShare={(shareData: any) => {
            // Get the template data for saving
            const selectedTemplate = dbRuleTemplates.find(t => t.id.toString() === template);
            
            enhancedSaveToUserLibraryMutation.mutate({
              name: shareData.title,
              promptContent: generatedPrompt,
              negativePrompt: '',
              description: shareData.description,
              tags: shareData.tags,
              template_used: selectedTemplate?.name || 'Custom', // Save the template name as template_used
              category: shareData.category_id ? promptCategories.find(c => c.id === shareData.category_id)?.name : undefined,
              status: 'published',
              isPublic: false,
              userId: "1",
              // Store template metadata in technicalParams
              technicalParams: selectedTemplate ? {
                templateId: selectedTemplate.id,
                templateName: selectedTemplate.name,
                templateType: selectedTemplate.template_type,
                templateDescription: selectedTemplate.description
              } : null
            });
          }}
          categories={promptCategories}
          isLoading={enhancedSaveToUserLibraryMutation.isPending}
          onNavigateToShared={() => {
            // Navigate to user's prompt library  
            window.location.href = '/prompts';
          }}
        />
      )}


      {/* Image Analysis Response - Collapsible section */}
      {imageAnalysisResponse && (
        <Card className="mt-4 bg-gray-900/50 border-gray-800">
          <CardContent className="p-4">
            <button
              onClick={() => setShowImageAnalysis(!showImageAnalysis)}
              className="w-full flex items-center justify-between p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className={`transform transition-transform ${showImageAnalysis ? 'rotate-90' : ''}`}>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
                <span className="text-sm font-medium text-gray-300">Image Analysis Response</span>
                <Badge variant="secondary" className="text-xs">
                  {selectedVisionModel === 'custom-vision' ? 'Florence-2' : 'Vision AI'}
                </Badge>
              </div>
              <span className="text-xs text-gray-500">
                {showImageAnalysis ? 'Click to collapse' : 'Click to expand'}
              </span>
            </button>
            
            {showImageAnalysis && (
              <div className="mt-4">
                <div className="bg-gray-800/50 rounded-lg p-4 relative">
                  <textarea
                    value={imageAnalysisResponse}
                    readOnly
                    className="w-full h-32 text-xs text-gray-300 bg-transparent border-none resize-none outline-none whitespace-pre-wrap break-words"
                    onClick={(e) => e.currentTarget.select()}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-gray-700/50"
                    onClick={() => {
                      navigator.clipboard.writeText(imageAnalysisResponse);
                      // Removed toast notification for cleaner UX
                    }}
                  >
                    <Copy className="h-3 w-3 text-gray-400" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Debug Report - Shows in Admin Mode */}
      {isAdminMode && debugReport && debugReport.length > 0 && (
        <Card className="mt-4 bg-gray-900/50 border-gray-800">
          <CardContent className="p-4">
            <button
              onClick={() => setShowDebugReport(!showDebugReport)}
              className="w-full flex items-center justify-between p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className={`transform transition-transform ${showDebugReport ? 'rotate-90' : ''}`}>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
                <span className="text-sm font-medium text-gray-300">Debug Report</span>
                <Badge variant="secondary" className="text-xs">
                  {debugReport.length} stages
                </Badge>
                {template && (
                  <Badge variant="outline" className="text-xs text-purple-400 border-purple-400/50">
                    {dbRuleTemplates.find(t => t.id.toString() === template)?.name || 'Unknown Template'}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-gray-500">
                {showDebugReport ? 'Click to collapse' : 'Click to expand'}
              </span>
            </button>
            
            {showDebugReport && (
              <div className="mt-4 space-y-4">
                {/* Fallback Testing Section */}
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-200">Fallback Testing</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-yellow-600 text-yellow-400 hover:bg-yellow-600/10"
                      onClick={async () => {
                        // Check if we have a prompt to test with
                        const testPrompt = generatedPrompt || subject;
                        if (!testPrompt) {
                          toast({ 
                            title: "No prompt to test", 
                            description: "Generate a prompt first or enter a subject",
                            variant: "destructive" 
                          });
                          return;
                        }

                        setIsGenerating(true);
                        setProgressVisible(true);
                        setProcessingStage('🔄 Testing secondary fallback...');
                        try {
                          // Re-run with forced secondary provider
                          const response = await fetch('/api/enhance-prompt', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              prompt: testPrompt,
                              templateId: template,
                              forceProvider: 'secondary',
                              debugReport: debugReport
                            }),
                          });
                          const data = await response.json();
                          if (data.enhanced_prompt) {
                            setGeneratedPrompt(data.enhanced_prompt);
                            // Update debug report with new data
                            if (data.debugReport) {
                              setDebugReport(data.debugReport);
                            }
                            toast({ title: "Secondary fallback test completed", description: "Check the debug report for details" });
                          }
                        } catch (error) {
                          toast({ title: "Fallback test failed", variant: "destructive" });
                        } finally {
                          setIsGenerating(false);
                          setProgressVisible(false);
                          setProcessingStage('');
                        }
                      }}
                      disabled={isGenerating}
                    >
                      Test Secondary
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-orange-600 text-orange-400 hover:bg-orange-600/10"
                      onClick={async () => {
                        // Check if we have a prompt to test with
                        const testPrompt = generatedPrompt || subject;
                        if (!testPrompt) {
                          toast({ 
                            title: "No prompt to test", 
                            description: "Generate a prompt first or enter a subject",
                            variant: "destructive" 
                          });
                          return;
                        }

                        setIsGenerating(true);
                        setProgressVisible(true);
                        setProcessingStage('🔄 Testing tertiary fallback...');
                        try {
                          // Re-run with forced tertiary provider
                          const response = await fetch('/api/enhance-prompt', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              prompt: testPrompt,
                              templateId: template,
                              forceProvider: 'tertiary',
                              debugReport: debugReport
                            }),
                          });
                          const data = await response.json();
                          if (data.enhanced_prompt) {
                            setGeneratedPrompt(data.enhanced_prompt);
                            // Update debug report with new data
                            if (data.debugReport) {
                              setDebugReport(data.debugReport);
                            }
                            toast({ title: "Tertiary fallback test completed", description: "Check the debug report for details" });
                          }
                        } catch (error) {
                          toast({ title: "Fallback test failed", variant: "destructive" });
                        } finally {
                          setIsGenerating(false);
                          setProgressVisible(false);
                          setProcessingStage('');
                        }
                      }}
                      disabled={isGenerating}
                    >
                      Test Tertiary
                    </Button>
                  </div>
                </div>

                {/* Debug Report Stages */}
                {debugReport.map((stage, index) => (
                  <div key={index} className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-200">{stage.stage}</h4>
                      <span className="text-xs text-gray-500">
                        {new Date(stage.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    {stage.model && (
                      <div className="text-xs text-gray-400">
                        Model: <span className="text-gray-300">{stage.model}</span>
                      </div>
                    )}
                    
                    {stage.error && (
                      <div className="bg-red-900/20 border border-red-800/50 rounded p-2">
                        <p className="text-xs text-red-400">Error: {stage.error}</p>
                      </div>
                    )}
                    
                    {stage.input && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-400">Input:</p>
                        <pre className="bg-gray-900/50 rounded p-2 text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(stage.input, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {stage.llmCallDetails && (
                      <div className="space-y-3 border-t border-gray-700 pt-3">
                        <p className="text-xs font-medium text-purple-400">LLM Call Details:</p>
                        
                        <div className="space-y-2">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-400">System Message:</span>
                              <button
                                onClick={() => navigator.clipboard.writeText(stage.llmCallDetails.systemMessage)}
                                className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded border border-blue-600/50 hover:border-blue-500"
                              >
                                Copy
                              </button>
                            </div>
                            <textarea
                              className="w-full bg-gray-800/50 p-2 rounded text-gray-300 text-xs font-mono border border-gray-700 resize-y min-h-24 max-h-48"
                              value={stage.llmCallDetails.systemMessage}
                              readOnly
                            />
                          </div>
                          
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-400">User Prompt:</span>
                              <button
                                onClick={() => navigator.clipboard.writeText(stage.llmCallDetails.userPrompt)}
                                className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded border border-blue-600/50 hover:border-blue-500"
                              >
                                Copy
                              </button>
                            </div>
                            <textarea
                              className="w-full bg-gray-800/50 p-2 rounded text-gray-300 text-xs font-mono border border-gray-700 resize-y min-h-16 max-h-32"
                              value={stage.llmCallDetails.userPrompt}
                              readOnly
                            />
                          </div>
                          
                          {stage.llmCallDetails.requestPayload && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-gray-400">Full API Payload:</span>
                                <button
                                  onClick={() => navigator.clipboard.writeText(JSON.stringify(stage.llmCallDetails.requestPayload, null, 2))}
                                  className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded border border-blue-600/50 hover:border-blue-500"
                                >
                                  Copy
                                </button>
                              </div>
                              <textarea
                                className="w-full bg-gray-800/50 p-2 rounded text-gray-300 text-xs font-mono border border-gray-700 resize-y min-h-32 max-h-64"
                                value={JSON.stringify(stage.llmCallDetails.requestPayload, null, 2)}
                                readOnly
                              />
                            </div>
                          )}
                          
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-400">LLM Response:</span>
                              <button
                                onClick={() => navigator.clipboard.writeText(stage.llmCallDetails.response)}
                                className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded border border-blue-600/50 hover:border-blue-500"
                              >
                                Copy
                              </button>
                            </div>
                            <textarea
                              className="w-full bg-green-900/20 border border-green-700/30 p-2 rounded text-green-100 text-xs font-mono resize-y min-h-24 max-h-48"
                              value={stage.llmCallDetails.response}
                              readOnly
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {stage.output && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-400">Output:</p>
                        <pre className="bg-gray-900/50 rounded p-2 text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(stage.output, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {stage.metadata && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-400">Metadata:</p>
                        <pre className="bg-gray-900/50 rounded p-2 text-xs text-gray-300 overflow-x-auto">
                          {JSON.stringify(stage.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </Card>
  );
}