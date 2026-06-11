import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { strictApiLimiter } from "../rateLimit";
import { isAuthenticated } from "../replitAuth";
import { GoogleGenAI, Type, Schema } from "@google/genai";

const router = Router();

// `/analyze` is public (no login) so the mobile companion can extract prompts.
// strictApiLimiter (10/min/IP) plus the caps below contain cost/abuse.
// `/generate-image` stays authenticated — the mobile app never calls it and it
// is the most expensive endpoint here (Gemini image generation).
const MAX_TEXT_CHARS = 8000;
const MAX_BASE64_CHARS = 8_000_000; // ~6MB binary, under the global 10mb body cap
const MAX_GENERATE_PROMPT_CHARS = 2000;

interface PromptImage {
  id: string;
  data: string;
  mimeType: string;
  isGenerated: boolean;
}

interface ExtractedPrompt {
  id: string;
  title: string;
  content: string;
  negativePrompt?: string;
  model?: string;
  images: PromptImage[];
  source: string;
  tags: string[];
  originalSourceImage?: string;
}

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  return new GoogleGenAI({ apiKey });
};

const stripBase64Prefix = (dataUrl: string): string => {
  return dataUrl.split(',')[1];
};

const cleanJson = (text: string): string => {
  let clean = text.trim();
  const firstBracket = clean.indexOf('[');
  const lastBracket = clean.lastIndexOf(']');
  
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    clean = clean.substring(firstBracket, lastBracket + 1);
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```(json)?/, '').replace(/```$/, '');
  }
  
  return clean.trim();
};

const PROMPT_EXTRACTION_SCHEMA: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "A short, descriptive title for the prompt." },
      content: { type: Type.STRING, description: "The full generative AI prompt text found." },
      negativePrompt: { type: Type.STRING, description: "Any negative prompt text found (optional)." },
      tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Keywords describing the style or subject." },
      suggestedModel: { type: Type.STRING, description: "The likely AI model this prompt is for (e.g. Midjourney, Stable Diffusion)." },
      imageParams: { type: Type.STRING, description: "Any parameters like --ar 16:9, steps, cfg scale found." }
    },
    required: ["title", "content", "tags"],
  },
};

const SYSTEM_INSTRUCTION = "You are an expert AI Data Parser specialized in extracting generative AI metadata and prompts from mixed media.";

router.post("/analyze", strictApiLimiter, async (req: Request, res: Response) => {
  console.log("[PromptMiner] Analyze request received:", { taskType: req.body.taskType, name: req.body.name });
  try {
    const { taskType, data, name, mimeType, base64 } = req.body;
    
    if (!taskType || !name) {
      console.log("[PromptMiner] Missing required fields");
      return res.status(400).json({ error: "Missing required fields: taskType and name" });
    }

    if (typeof data === "string" && data.length > MAX_TEXT_CHARS) {
      return res.status(400).json({ error: `Text too long. Maximum ${MAX_TEXT_CHARS} characters.` });
    }
    if (typeof base64 === "string" && base64.length > MAX_BASE64_CHARS) {
      return res.status(400).json({ error: "Image too large. Please use a smaller image." });
    }

    const ai = getAI();
    console.log("[PromptMiner] Gemini AI initialized");
    const parts: any[] = [];
    const sourceName = name;
    let sourceBase64: string | undefined = undefined;
    
    const isUrl = taskType === 'text' && typeof data === 'string' && 
                  (data.startsWith('http://') || data.startsWith('https://'));

    if (taskType === 'file' && base64) {
      sourceBase64 = base64;
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: stripBase64Prefix(base64),
        },
      });
    } else if (taskType === 'text') {
      parts.push({ text: `Analyze the following content:\n${data}` });
    } else {
      return res.status(400).json({ error: "Invalid task type or missing data" });
    }

    let promptText = `
      Analyze the provided content. 
      Identify and extract any "Generative AI Prompts" present. 
      A prompt is a detailed text description used to generate images or text.
      Sometimes prompts are in metadata, screenshots of web UIs, or just plain text lists.
      
      If an image is a screenshot of a prompt interface (like Civitai, Midjourney Discord), extract the prompt text carefully.
    `;

    if (isUrl) {
      promptText += `
        \nSince this is a URL, use Google Search to retrieve the context, caption, or text content of the page.
        Look for image generation parameters, prompts, or art descriptions in the post caption or comments.
        IMPORTANT: Return ONLY a JSON array of the extracted data. Do not include markdown formatting or conversational text.
      `;
    } else {
      promptText += `\nReturn a JSON array of the extracted prompts. If no prompts are found, return an empty array.`;
    }

    parts.push({ text: promptText });

    const config: any = {
      systemInstruction: SYSTEM_INSTRUCTION,
    };

    if (isUrl) {
      config.tools = [{ googleSearch: {} }];
    } else {
      config.responseMimeType = "application/json";
      config.responseSchema = PROMPT_EXTRACTION_SCHEMA;
    }

    console.log("[PromptMiner] Calling Gemini API with model: gemini-2.5-flash");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: config,
    });
    console.log("[PromptMiner] Gemini API response received");

    const rawText = response.text || "[]";
    const cleanedJson = cleanJson(rawText);
    let parsedPrompts: any[] = [];
    
    try {
      parsedPrompts = JSON.parse(cleanedJson);
    } catch (e) {
      console.warn(`JSON Parse error for ${sourceName}. Raw text:`, rawText);
      if (isUrl && rawText.length > 20) {
        parsedPrompts = [{
          title: `Extracted from Link`,
          content: rawText.substring(0, 500),
          tags: ["link-content"],
          suggestedModel: "Unknown"
        }];
      } else {
        return res.status(500).json({ error: "Invalid JSON response from model" });
      }
    }

    if (!Array.isArray(parsedPrompts)) {
      if (typeof parsedPrompts === 'object' && parsedPrompts !== null) {
        parsedPrompts = [parsedPrompts];
      } else {
        parsedPrompts = [];
      }
    }

    const mappedPrompts: ExtractedPrompt[] = parsedPrompts.map((p: any) => ({
      id: randomUUID(),
      title: p.title || `Prompt from ${sourceName}`,
      content: p.content,
      negativePrompt: p.negativePrompt,
      model: p.suggestedModel,
      tags: p.tags || [],
      source: sourceName,
      images: [],
      originalSourceImage: sourceBase64
    }));

    res.json({ prompts: mappedPrompts });

  } catch (error: any) {
    console.error("[PromptMiner] Analyze error:", error?.message || error);
    console.error("[PromptMiner] Full error:", JSON.stringify(error, null, 2));
    res.status(500).json({ error: error.message || "Analysis failed" });
  }
});

router.post("/generate-image", isAuthenticated, strictApiLimiter, async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing prompt" });
    }
    if (prompt.length > MAX_GENERATE_PROMPT_CHARS) {
      return res.status(400).json({ error: `Prompt too long. Maximum ${MAX_GENERATE_PROMPT_CHARS} characters.` });
    }

    const ai = getAI();
    
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: {
        parts: [{ text: `Generate an image based on this prompt: ${prompt}` }]
      },
      config: {
        responseModalities: ["image", "text"]
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      return res.status(500).json({ error: "No content generated" });
    }

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return res.json({
          image: {
            id: randomUUID(),
            data: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
            mimeType: part.inlineData.mimeType,
            isGenerated: true
          }
        });
      }
    }

    res.status(500).json({ error: "No image data found in response" });

  } catch (error: any) {
    console.error("PromptMiner generate-image error:", error);
    res.status(500).json({ error: error.message || "Image generation failed" });
  }
});

export default router;