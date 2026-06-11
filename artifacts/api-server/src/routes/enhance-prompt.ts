import { Router } from 'express';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { isAuthenticated } from '../replitAuth';
import { strictApiLimiter } from '../rateLimit';

const router = Router();

// Public (unauthenticated) callers can reach POST '/' so the mobile companion
// can use the prompt generator without login. To contain cost/abuse we never
// forward an arbitrary client-supplied model to the provider — we coerce to a
// known-good allowlist — and we cap input length. `/batch` stays authenticated.
const ALLOWED_MODELS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini'],
  google: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-flash-latest'],
};
const DEFAULT_MODEL: Record<string, string> = {
  openai: 'gpt-4o',
  google: 'gemini-2.5-flash',
};
const MAX_PROMPT_CHARS = 4000;

function sanitizeProvider(provider: unknown): 'openai' | 'google' {
  return provider === 'google' ? 'google' : 'openai';
}

function sanitizeModel(provider: 'openai' | 'google', model: unknown): string {
  if (typeof model === 'string' && ALLOWED_MODELS[provider].includes(model)) {
    return model;
  }
  return DEFAULT_MODEL[provider];
}

/**
 * Clean LLM response to remove unwanted formatting
 */
function cleanLLMResponse(response: string): string {
  return response
    .replace(/^["']|["']$/g, '') // Remove quotes
    .replace(/^Enhanced prompt:\s*/i, '') // Remove prefix
    .replace(/^Generated prompt:\s*/i, '')
    .replace(/\*\*/g, '') // Remove markdown bold
    .replace(/^\n+|\n+$/g, '') // Trim newlines
    .trim();
}

/**
 * Build system prompt for LLM enhancement
 */
function buildSystemPrompt(
  template: any,
  subject?: string,
  character?: any
): string {
  let systemPrompt = template.master_prompt || 
    "You are a professional AI prompt engineer. Transform the given prompt into a highly detailed, optimized prompt for image generation.";

  // Add context about replacements if needed
  if (character && character.name) {
    systemPrompt += `\n\nIMPORTANT: Replace any generic character references with "${character.name}" - ${character.description || ''}`;
  }

  if (subject) {
    systemPrompt += `\n\nOriginal subject context: ${subject}`;
  }

  systemPrompt += "\n\nProvide ONLY the enhanced prompt text, no explanations or meta-text.";

  return systemPrompt;
}

/**
 * Enhance prompt with OpenAI
 */
async function enhanceWithOpenAI(
  prompt: string,
  systemPrompt: string,
  model: string = 'gpt-4o'
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({ apiKey });
  
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ],
    max_tokens: 2000,
    temperature: 0.7,
    presence_penalty: 0.1,
    frequency_penalty: 0.1
  });

  return cleanLLMResponse(completion.choices[0].message.content || prompt);
}

/**
 * Enhance prompt with Google Gemini
 */
async function enhanceWithGemini(
  prompt: string,
  systemPrompt: string,
  model: string = 'gemini-pro'
): Promise<string> {
  // GOOGLE_AI_API_KEY and GEMINI_API_KEY are both AI Studio keys; accept either
  // so the Gemini path works wherever one of them is configured.
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Google AI API key not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model });

  const fullPrompt = `${systemPrompt}\n\nOriginal prompt:\n${prompt}\n\nEnhanced prompt:`;
  const result = await geminiModel.generateContent(fullPrompt);
  const response = await result.response;

  return cleanLLMResponse(response.text());
}

/**
 * Compress prompt if needed
 */
function compressPrompt(
  prompt: string,
  compressionLevel: string = 'medium'
): string {
  const levels: Record<string, number> = {
    light: 500,
    medium: 350,
    heavy: 200
  };

  const maxLength = levels[compressionLevel] || 350;

  if (prompt.length <= maxLength) {
    return prompt;
  }

  // Smart compression - keep important keywords
  const words = prompt.split(/\s+/);
  const importantKeywords = [
    'cinematic', 'dramatic', 'portrait', 'landscape',
    'lighting', 'composition', 'style', 'detailed',
    'resolution', 'camera', 'lens', 'shot'
  ];

  // Prioritize important words
  const prioritized = words.filter(word => 
    importantKeywords.some(kw => word.toLowerCase().includes(kw))
  );

  const remaining = words.filter(word => 
    !importantKeywords.some(kw => word.toLowerCase().includes(kw))
  );

  // Rebuild prompt with priority words first
  let compressed = prioritized.join(' ');
  
  for (const word of remaining) {
    if ((compressed + ' ' + word).length <= maxLength) {
      compressed += ' ' + word;
    } else {
      break;
    }
  }

  return compressed;
}

/**
 * Add "happy talk" positive modifiers
 */
function addHappyTalk(prompt: string): string {
  const happyModifiers = [
    'masterpiece',
    'best quality',
    'ultra-detailed',
    'professional',
    'stunning',
    'beautiful',
    'perfect'
  ];

  // Check if prompt already has these modifiers
  const hasModifiers = happyModifiers.some(mod => 
    prompt.toLowerCase().includes(mod)
  );

  if (!hasModifiers) {
    // Add some positive modifiers at the beginning
    const selectedModifiers = happyModifiers
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
      .join(', ');
    
    return `${selectedModifiers}, ${prompt}`;
  }

  return prompt;
}

/**
 * POST /api/enhance-prompt
 * Enhance a prompt using LLM
 */
router.post('/', strictApiLimiter, async (req, res) => {
  try {
    const {
      prompt,
      llmProvider: rawProvider = 'openai',
      llmModel: rawModel = 'gpt-4o',
      useHappyTalk = false,
      compressPrompt: shouldCompress = false,
      compressionLevel = 'medium',
      customBasePrompt,
      templateId,
      subject,
      character
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: 'No prompt provided',
        success: false
      });
    }

    // Cap every free-text field that gets concatenated into the provider call,
    // not just `prompt`. `subject` and `character.*` are forwarded into the
    // system prompt, so leaving them uncapped lets an unauthenticated caller
    // amplify per-request token spend far past the intended limit.
    const overLong = (v: unknown): boolean =>
      typeof v === 'string' && v.length > MAX_PROMPT_CHARS;
    if (
      prompt.length > MAX_PROMPT_CHARS ||
      overLong(customBasePrompt) ||
      overLong(subject) ||
      (character && typeof character === 'object' &&
        (overLong(character.name) || overLong(character.description)))
    ) {
      return res.status(400).json({
        error: `Prompt too long. Maximum ${MAX_PROMPT_CHARS} characters.`,
        success: false
      });
    }

    // Never forward an arbitrary client-supplied model/provider to the provider.
    const llmProvider = sanitizeProvider(rawProvider);
    const llmModel = sanitizeModel(llmProvider, rawModel);

    const startTime = Date.now();
    const diagnostics: any = {
      originalLength: prompt.length,
      templateUsed: templateId || 'custom',
      llmProvider,
      llmModel,
      startTime: new Date().toISOString()
    };

    try {
      // Build system prompt
      const template = {
        master_prompt: customBasePrompt || 
          "Transform this into a highly detailed, cinematic prompt optimized for AI image generation. Include camera angles, lighting, composition, and artistic style."
      };

      const systemPrompt = buildSystemPrompt(template, subject, character);

      // Enhance with selected LLM
      let enhancedPrompt: string;
      let llmCallDetails: any = {};

      if (llmProvider === 'openai') {
        // Capture full request details
        llmCallDetails.request = {
          provider: 'openai',
          model: llmModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          max_tokens: 2000,
          temperature: 0.7,
          presence_penalty: 0.1,
          frequency_penalty: 0.1
        };
        
        const startTime = Date.now();
        enhancedPrompt = await enhanceWithOpenAI(prompt, systemPrompt, llmModel);
        llmCallDetails.responseTime = Date.now() - startTime;
        llmCallDetails.response = {
          enhancedPrompt,
          model: llmModel,
          provider: 'openai'
        };
        
        diagnostics.modelUsed = llmModel;
        diagnostics.llmCallDetails = llmCallDetails;
      } else if (llmProvider === 'google') {
        // Capture full request details for Gemini
        llmCallDetails.request = {
          provider: 'google',
          model: llmModel,
          prompt: `${systemPrompt}\n\nOriginal prompt:\n${prompt}\n\nEnhanced prompt:`
        };
        
        const startTime = Date.now();
        enhancedPrompt = await enhanceWithGemini(prompt, systemPrompt, llmModel);
        llmCallDetails.responseTime = Date.now() - startTime;
        llmCallDetails.response = {
          enhancedPrompt,
          model: llmModel,
          provider: 'google'
        };
        
        diagnostics.modelUsed = llmModel;
        diagnostics.llmCallDetails = llmCallDetails;
      } else {
        // Fallback to basic enhancement
        enhancedPrompt = `${prompt}, professional photography, dramatic lighting, high resolution, detailed composition`;
        diagnostics.modelUsed = 'fallback';
        diagnostics.llmCallDetails = {
          request: { provider: 'fallback', prompt },
          response: { enhancedPrompt },
          responseTime: 0
        };
      }

      // Apply happy talk if requested
      if (useHappyTalk) {
        enhancedPrompt = addHappyTalk(enhancedPrompt);
        diagnostics.happyTalkApplied = true;
      }

      // Apply compression if requested
      if (shouldCompress) {
        const originalLength = enhancedPrompt.length;
        enhancedPrompt = compressPrompt(enhancedPrompt, compressionLevel);
        diagnostics.compressionApplied = true;
        diagnostics.compressionLevel = compressionLevel;
        diagnostics.compressedFrom = originalLength;
        diagnostics.compressedTo = enhancedPrompt.length;
      }

      // Calculate processing time
      diagnostics.responseTime = Date.now() - startTime;
      diagnostics.enhancedLength = enhancedPrompt.length;
      diagnostics.templateSource = customBasePrompt ? 'database' : 'default';

      // Return enhanced prompt
      res.json({
        success: true,
        enhancedPrompt,
        diagnostics,
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: diagnostics.responseTime,
          provider: llmProvider,
          model: llmModel
        }
      });

    } catch (enhanceError: any) {
      // Log specific enhancement error
      console.error('Enhancement error:', enhanceError);
      diagnostics.error = enhanceError.message;
      
      // Return fallback enhancement
      const fallbackPrompt = `${prompt}, professional quality, detailed, high resolution`;
      
      res.json({
        success: true,
        enhancedPrompt: fallbackPrompt,
        diagnostics: {
          ...diagnostics,
          fallbackUsed: true,
          error: enhanceError.message
        },
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          provider: 'fallback',
          model: 'basic'
        }
      });
    }

  } catch (error: any) {
    console.error('Enhance prompt error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to enhance prompt',
      diagnostics: {
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
});

/**
 * POST /api/enhance-prompt/batch
 * Enhance multiple prompts at once
 */
router.post('/batch', isAuthenticated, strictApiLimiter, async (req, res) => {
  try {
    const { prompts, ...settings } = req.body;

    if (!prompts || !Array.isArray(prompts)) {
      return res.status(400).json({
        error: 'No prompts array provided',
        success: false
      });
    }

    const BATCH_LIMIT = 10;
    if (prompts.length > BATCH_LIMIT) {
      return res.status(400).json({
        error: `Batch size exceeds limit. Maximum ${BATCH_LIMIT} prompts per request.`,
        success: false
      });
    }

    const results = await Promise.all(
      prompts.map(async (prompt) => {
        try {
          const response = await enhanceWithOpenAI(
            prompt,
            buildSystemPrompt(settings.template || {}, settings.subject, settings.character),
            settings.llmModel || 'gpt-4o'
          );
          return {
            original: prompt,
            enhanced: response,
            success: true
          };
        } catch (error: any) {
          return {
            original: prompt,
            enhanced: prompt,
            success: false,
            error: error.message
          };
        }
      })
    );

    res.json({
      success: true,
      results,
      metadata: {
        total: prompts.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Batch enhance error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to enhance prompts'
    });
  }
});

export default router;