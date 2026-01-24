import { Router } from 'express';
import OpenAI from 'openai';
import { isAuthenticated } from '../replitAuth';

const router = Router();

interface ExtractedItem {
  prompt: string;
  tags: string[];
  promptType: string;
  promptStyle: string;
  intendedModel: string;
  slideIndex?: number;
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
SOCIAL MEDIA CONTEXT:
- Platform: ${socialContext.platform}
- Author: ${socialContext.author || "N/A"}
- Title: ${socialContext.title || "N/A"}
- Text Content: "${socialContext.text || ""}"
- Media URLs: ${socialContext.mediaUrls?.join(", ") || "None"}
`;
    }

    const systemPrompt = `You are an expert AI prompt engineer and analyst. Your task is to extract AI generation prompts from social media content, images, or text.

INSTRUCTIONS:
1. VISUAL ANALYSIS (PRIORITY):
   - If images are provided, carefully read any text visible in them (OCR)
   - Look for prompts written as overlays, captions, or embedded text
   - If multiple images (carousel), check each slide for different prompts

2. TEXT ANALYSIS:
   - Extract prompts from captions, descriptions, or provided context
   - Look for prompt patterns (detailed descriptions, style keywords, model parameters)

3. CLASSIFICATION:
   For each prompt found, determine:
   - promptType: Image, Video, 3D, Agentic, Writing, Code, etc.
   - promptStyle: JSON, Narrative, Instructional, Technical, Minimal
   - intendedModel: Midjourney, DALL-E, Stable Diffusion, Flux, Runway, ChatGPT, etc.
   - tags: Relevant keywords and themes

4. RECONSTRUCTION:
   - If no direct prompt text is found but images show AI-generated content, 
     reconstruct what the prompt might have been based on the visual elements

RESPOND IN JSON FORMAT:
{
  "analysis": "Brief summary of what you found",
  "method": "direct" | "reconstructed" | "failed",
  "items": [
    {
      "prompt": "The extracted or reconstructed prompt text",
      "tags": ["tag1", "tag2"],
      "promptType": "Image",
      "promptStyle": "Narrative", 
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
        prompt: item.prompt || '',
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

export default router;
