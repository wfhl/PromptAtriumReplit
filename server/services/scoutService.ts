import { GoogleGenAI } from "@google/genai";

/**
 * Extract a JSON array from a model text response. Handles raw JSON as well as
 * responses wrapped in markdown code fences or surrounded by stray prose, which
 * can happen when grounding (googleSearch) is enabled and structured output is
 * therefore unavailable.
 */
const extractJsonArray = (text: string): any[] => {
  if (!text) return [];

  const tryParse = (candidate: string): any[] | null => {
    try {
      const parsed = JSON.parse(candidate);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  // 1. Direct parse (model obeyed "raw JSON array").
  const direct = tryParse(text.trim());
  if (direct) return direct;

  // 2. Strip markdown code fences (```json ... ``` or ``` ... ```).
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    const fenced = tryParse(fenceMatch[1].trim());
    if (fenced) return fenced;
  }

  // 3. Fall back to the first top-level [ ... ] block in the text.
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    const sliced = tryParse(text.slice(start, end + 1));
    if (sliced) return sliced;
  }

  console.error("Failed to parse scout response as JSON array.");
  return [];
};

export interface ScoutedPrompt {
  id: string;
  title: string;
  promptText: string;
  platform: string;
  sourceUrl?: string;
  category?: string;
  promptType?: string;
  promptStyle?: string;
  intendedModel?: string;
  engagementMetrics?: {
    likes?: number;
    views?: number;
  };
  tags: string[];
}

export interface ScoutResult {
  rawText: string;
  chunks: any[];
  parsedPrompts: ScoutedPrompt[];
}

export const searchTrendingPrompts = async (topic: string): Promise<ScoutResult> => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required for Scout functionality");
  }

  const ai = new GoogleGenAI({ apiKey });
  // Using Gemini 2.5 Pro for superior reasoning and reduced hallucination on Search tasks
  const modelId = 'gemini-2.5-pro';

  const searchPrompt = `
    You are a specialized Data Archivist. Your mandate is to find REAL, VERIFIABLE AI prompts for "${topic}" using Google Search.

    STRICT GROUNDING RULES (ZERO TOLERANCE FOR HALLUCINATION):
    1. **Real URLs Only**: You must extract the \`sourceUrl\` EXACTLY as provided by the Google Search tool.
       - DO NOT construct, guess, or predict links (e.g., never invent a specific Reddit comment URL like '.../comments/xyz/').
       - If a direct post link isn't available, use the main page URL found in the search result.
       - If you cannot verify a link exists in your search results, **exclude that prompt**.

    2. **Verbatim Extraction**: The \`promptText\` must be actual text found on the webpage. Do not write your own prompts.

    3. **No Synthetic Metrics**: If likes/views are not explicitly visible in the search snippet, set them to 0 or null. Do not guess.

    Search Targets: Reddit (r/StableDiffusion, r/midjourney), Civitai, Twitter/X, GitHub, Discord archives.

    Goal: Find up to 10 HIGH-QUALITY, verifiable results. It is better to return 5 real links than 10 broken ones.

    OUTPUT FORMAT (CRITICAL):
    Respond with ONLY a raw JSON array. No prose, no explanation, no markdown code fences.
    Each array element must be an object with these fields:
    - title: Short descriptive title. (string)
    - promptText: The raw prompt. (string)
    - platform: Source platform. (string)
    - sourceUrl: The verifiable link. (string)
    - promptType: 'Image', 'Video', 'Writing', 'Code', '3D'. (string)
    - promptStyle: 'Photorealistic', 'Anime', 'Surreal', 'JSON', 'Agentic'. (string)
    - intendedModel: 'Midjourney', 'Flux', 'SDXL', 'DALL-E 3', etc. (string)
    - engagementMetrics: { likes, views } (numbers, only if found, otherwise omit or use 0)
    - tags: array of strings.

    If you find no verifiable results, return an empty array: []
  `;

  try {
    // NOTE: Gemini does NOT support responseMimeType/responseSchema (structured
    // output) together with the googleSearch grounding tool — combining them
    // returns a 400 INVALID_ARGUMENT. We rely on the prompt to request JSON and
    // parse it out of the grounded text response below.
    const response = await ai.models.generateContent({
      model: modelId,
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        // Pro model handles complex extraction better with a slightly non-zero temp
        // but kept low to prevent creative writing.
        temperature: 0.1,
      },
    });

    const parsedPrompts = extractJsonArray(response.text || "");

    const promptsWithIds: ScoutedPrompt[] = parsedPrompts.map((p: any) => ({
      ...p,
      id: crypto.randomUUID(),
      category: 'Uncategorized'
    }));

    return {
      rawText: response.text || "",
      chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
      parsedPrompts: promptsWithIds
    };
  } catch (error: any) {
    console.error("Scout search failed:", error);
    throw error;
  }
};
