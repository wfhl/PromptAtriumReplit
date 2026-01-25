import { GoogleGenAI, Type } from "@google/genai";

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

    Output Schema:
    - title: Short descriptive title (3-8 words).
    - promptText: The raw prompt.
    - platform: Source platform.
    - sourceUrl: The verifiable link.
    - promptType: 'Image', 'Video', 'Writing', 'Code', '3D'.
    - promptStyle: 'Photorealistic', 'Anime', 'Surreal', 'JSON', 'Agentic'.
    - intendedModel: 'Midjourney', 'Flux', 'SDXL', 'DALL-E 3', etc.
    - engagementMetrics: { likes, views } (Only if found).
    - tags: []
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              promptText: { type: Type.STRING },
              platform: { type: Type.STRING },
              sourceUrl: { type: Type.STRING, description: "The EXACT, clickable URL found in the search result." },
              promptType: { type: Type.STRING },
              promptStyle: { type: Type.STRING },
              intendedModel: { type: Type.STRING },
              engagementMetrics: {
                type: Type.OBJECT,
                properties: {
                  likes: { type: Type.NUMBER },
                  views: { type: Type.NUMBER }
                }
              },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["title", "promptText", "platform", "sourceUrl", "tags"]
          }
        }
      },
    });

    const parsedPrompts = JSON.parse(response.text || "[]");

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
