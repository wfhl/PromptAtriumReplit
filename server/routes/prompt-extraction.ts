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

    const systemPrompt = `You are an expert AI art forensic analyst and prompt engineer. Your task is to extract, clean, and categorize the generative AI prompts from the content provided.

INSTRUCTIONS:
1. **VISUAL ANALYSIS (PRIORITY)**:
   - If images are provided (especially multiple slides), you **MUST** read the text inside them (OCR).
   - **Carousel Logic**: If multiple images are present, check if each slide contains a *separate* prompt.
   - If the carousel contains 5 slides, and each has a different prompt (e.g., "Editing Plan", "Style Matching"), return them as **5 separate items** in the output list.
   - **Slide Mapping**: If possible, identify which slide index (0-based) the prompt came from.

2. **TEXT ANALYSIS**:
   - Extract prompts from captions, descriptions, or provided context
   - Look for prompt patterns (detailed descriptions, style keywords, model parameters)
   - **CRITICAL**: If the prompt is formatted as **JSON**, you MUST preserve the JSON structure exactly.

3. **FIND THE PROMPT(S)**:
   - Extract the prompt text exactly as written.
   - For each prompt found, determine:
     - **promptType**: Classify (e.g., "Image", "Video", "3D", "Agentic", "Writing", "Code")
     - **promptStyle**: Classify (e.g., "JSON", "Narrative", "Instructional", "Cinematic")
     - **intendedModel**: Identify (e.g., "Midjourney", "DALL-E", "Stable Diffusion", "Flux", "Runway", "ChatGPT", "Sora")
     - **tags**: Relevant keywords and themes

4. **RECONSTRUCTION**:
   - If no direct prompt text is found, reconstruct it based on the visual analysis of the provided media.
   - Describe what elements, styles, and techniques were likely used to generate the image.

RESPOND IN JSON FORMAT:
{
  "analysis": "Brief overview of what you found (e.g. 'Found 5 prompts in the carousel').",
  "method": "direct" | "reconstructed" | "failed",
  "items": [
    {
      "prompt": "The actual prompt text...",
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
