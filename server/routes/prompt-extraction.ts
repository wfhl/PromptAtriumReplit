import { Router } from 'express';
import OpenAI from 'openai';
import { isAuthenticated } from '../replitAuth';
import { searchTrendingPrompts } from '../services/scoutService';
import { storage } from '../storage';

const router = Router();

interface ExtractedItem {
  prompt: string | object;
  name: string;
  tags: string[];
  promptType: string;
  promptStyle: string;
  intendedModel: string;
  slideIndex?: number;
  sourceUrl?: string;
  platform?: string;
}

interface ExtractionResult {
  analysis: string;
  items: ExtractedItem[];
  method: 'direct' | 'reconstructed' | 'failed';
}

interface SocialContext {
  platform: string;
  originalUrl?: string;
  title?: string;
  text?: string;
  author?: string;
  mediaUrls: string[];
  thumbnail?: string;
  rawResponse?: any;
}

router.post('/extract', isAuthenticated, async (req: any, res) => {
  try {
    const { url, textContext, mediaData, socialContext } = req.body as {
      url?: string;
      textContext?: string;
      mediaData?: { base64: string; mimeType: string }[];
      socialContext?: SocialContext;
    };

    if (!url && (!mediaData || mediaData.length === 0) && !textContext) {
      return res.status(400).json({ 
        error: 'Please provide a URL, media, or text context' 
      });
    }

    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const openai = new OpenAI({ 
      apiKey,
      baseURL: baseURL || undefined
    });

    let contextDescription = "";
    if (socialContext) {
      contextDescription = `
SUCCESSFUL SOCIAL MEDIA EXTRACTION:
We have successfully retrieved detailed metadata for this link. Use this as the PRIMARY source of truth.
- Platform: ${socialContext.platform}
- Author: ${socialContext.author || "N/A"}
- Title: ${socialContext.title || "N/A"}
- Full Text Content: "${socialContext.text || ""}"
- Media URLs Found: ${socialContext.mediaUrls?.join(", ") || "None"}
`;
      if (socialContext.rawResponse) {
        contextDescription += `\n- Raw Metadata: ${JSON.stringify(socialContext.rawResponse).slice(0, 2000)}`;
      }
    }

    const [availableTypes, availableStyles] = await Promise.all([
      storage.getPromptTypes({ isActive: true }),
      storage.getPromptStyles({ isActive: true })
    ]);

    const typeList = availableTypes.map(t => t.name).join(", ");
    const styleList = availableStyles.map(s => s.name).join(", ");

    const systemPrompt = `You are an expert AI art forensic analyst and prompt engineer. Your task is to extract, clean, and categorize the generative AI prompts from the content provided.

INSTRUCTIONS:
1. **VISUAL ANALYSIS (PRIORITY)**:
   - If images are provided (especially multiple slides), you **MUST** read the text inside them (OCR).
   - **Carousel Logic**: If multiple images are present, check if each slide contains a *separate* prompt.
   - If the carousel contains 5 slides, and each has a different prompt (e.g., "Editing Plan", "Style Matching"), return them as **5 separate items** in the output list.
   - **Slide Mapping**: If possible, identify which slide index (0-based) the prompt came from.

2. **PROMPT EXTRACTION & FORMATTING (CRITICAL)**:
   - **JSON PRESERVATION**: If a prompt is formatted as a JSON object (e.g., containing "prompt_structure", "subject", "appearance", etc.), you **MUST** extract and preserve the entire JSON block exactly as written. Do NOT simplify it to a string.
   - **CLEANING**: Remove any social media artifacts (likes, share buttons, UI elements) from the prompt text.
   - **ACCURACY**: Extract the prompt text EXACTLY as presented in the source.

3. **METADATA EXTRACTION (Per Item)**:
   - **name**: Generate a SHORT, DESCRIPTIVE title (3-8 words max) that captures the essence of the prompt. Examples: "Ethereal Forest Portrait", "Cyberpunk City at Night", "Vintage Film Noir Woman", "Golden Hour Beach Scene"
   - **promptType**: Classify using ONLY these available types if they fit: ${typeList}. If none fit well, provide a suitable general classification.
   - **promptStyle**: Classify using ONLY these available styles if they fit: ${styleList}. If none fit well, provide a suitable general classification.
   - **intendedModel**: Identify (e.g., "Midjourney", "DALL-E", "Stable Diffusion", "Flux", "Runway", "ChatGPT", "Sora")
   - **tags**: Relevant keywords and themes

4. **RECONSTRUCTION**:
   - If no direct prompt text is found, reconstruct it based on the visual analysis.

RESPOND IN JSON FORMAT:
{
  "analysis": "Brief overview of what you found.",
  "method": "direct" | "reconstructed" | "failed",
  "items": [
    {
      "prompt": "The actual prompt text (preserve JSON if present)...",
      "name": "Short Descriptive Title",
      "tags": ["tag1", "tag2"],
      "promptType": "Image",
      "promptStyle": "JSON",
      "intendedModel": "Midjourney",
      "slideIndex": 0
    }
  ]
}`;

    const userPrompt = `Extract AI prompts from this content:

URL: ${url || "None provided"}
Additional Context: ${textContext || "None provided"}
${contextDescription}
Media Files: ${mediaData?.length || 0} image(s) provided

Please analyze all provided content and extract any AI generation prompts.`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt }
    ];

    if (mediaData && mediaData.length > 0) {
      const content: OpenAI.Chat.ChatCompletionContentPart[] = [
        { type: "text", text: userPrompt }
      ];

      for (const media of mediaData.slice(0, 10)) {
        if (media.mimeType.startsWith('image/')) {
          content.push({
            type: "image_url",
            image_url: {
              url: `data:${media.mimeType};base64,${media.base64}`,
              detail: "high"
            }
          });
        }
      }

      messages.push({ role: "user", content });
    } else {
      messages.push({ role: "user", content: userPrompt });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 4000,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0].message.content || "{}";
    
    try {
      const result = JSON.parse(responseText) as ExtractionResult;
      
      if (!result.items) {
        result.items = [];
      }
      if (!result.method) {
        result.method = result.items.length > 0 ? 'reconstructed' : 'failed';
      }
      if (!result.analysis) {
        result.analysis = result.items.length > 0 
          ? `Found ${result.items.length} prompt(s)` 
          : 'No prompts could be extracted';
      }

      result.items = result.items.map(item => ({
        prompt: item.prompt && typeof item.prompt === 'object' ? JSON.stringify(item.prompt, null, 2) : (item.prompt || ''),
        name: item.name || 'Imported Prompt',
        tags: Array.isArray(item.tags) ? item.tags : [],
        promptType: item.promptType || 'General',
        promptStyle: item.promptStyle || 'Narrative',
        intendedModel: item.intendedModel || 'Unknown',
        slideIndex: item.slideIndex
      }));

      return res.json(result);
    } catch (parseError) {
      console.error('Failed to parse extraction result:', parseError);
      return res.json({
        analysis: 'Failed to parse AI response',
        items: [],
        method: 'failed'
      } as ExtractionResult);
    }
  } catch (error: any) {
    console.error('Prompt extraction error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to extract prompts' 
    });
  }
});

router.post('/scout', isAuthenticated, async (req: any, res) => {
  try {
    const { keywords } = req.body as { keywords: string };

    if (!keywords || keywords.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide keywords to scout' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ 
        error: 'Scout feature requires GEMINI_API_KEY. Please add it in your secrets.' 
      });
    }

    // Call scout with clean keywords - types/styles will be applied after
    const result = await searchTrendingPrompts(keywords.trim());
    
    // Fetch available types and styles for post-processing classification
    const [availableTypes, availableStyles] = await Promise.all([
      storage.getPromptTypes({ isActive: true }),
      storage.getPromptStyles({ isActive: true })
    ]);
    
    // Helper to find matching type/style from database or use original
    const matchType = (scoutType: string | undefined) => {
      const lower = (scoutType || '').toLowerCase();
      const found = availableTypes.find(t => t.name.toLowerCase() === lower);
      return found ? found.name : (scoutType || 'Image');
    };
    
    const matchStyle = (scoutStyle: string | undefined) => {
      const lower = (scoutStyle || '').toLowerCase();
      const found = availableStyles.find(s => s.name.toLowerCase() === lower);
      return found ? found.name : (scoutStyle || 'Unknown');
    };

    const items: ExtractedItem[] = result.parsedPrompts.map(p => ({
      prompt: p.promptText,
      name: p.title || 'Scouted Prompt',
      tags: p.tags || [],
      promptType: matchType(p.promptType),
      promptStyle: matchStyle(p.promptStyle),
      intendedModel: p.intendedModel || 'Unknown',
      sourceUrl: p.sourceUrl,
      platform: p.platform,
    }));

    return res.json({
      analysis: `Found ${items.length} trending prompts for "${keywords}"`,
      items,
      method: items.length > 0 ? 'direct' : 'failed',
      sources: result.parsedPrompts.map(p => ({
        platform: p.platform,
        sourceUrl: p.sourceUrl,
        engagement: p.engagementMetrics
      }))
    });
  } catch (error: any) {
    console.error('Scout error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to scout prompts' 
    });
  }
});

export default router;
