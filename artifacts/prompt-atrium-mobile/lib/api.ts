import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
} from "@tanstack/react-query";

/**
 * Data layer for PromptAtrium Mobile.
 *
 * Mirrors the web app's hand-written fetch layer (src/lib/queryClient.ts)
 * rather than generated OpenAPI hooks — the shared OpenAPI spec only covers
 * the healthcheck, while the real product API is the legacy Express surface.
 *
 * Expo bundles run outside the Replit shared proxy, so absolute URLs are
 * required. EXPO_PUBLIC_DOMAIN is injected at build time by the workflow.
 */
const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
export const API_BASE = DOMAIN ? `https://${DOMAIN}` : "";

/**
 * Resolve an image URL coming from the API into an absolute URL the native
 * client can load. Mirrors the web app's PromptImageCarousel resolution so the
 * same stored values render identically, but prefixes API_BASE because Expo
 * bundles run outside the Replit shared proxy and need absolute URLs.
 *
 * Object-storage values arrive as `/objects/<key>`; the public read route is
 * `/api/objects/serve/<url-encoded key>` (the bare `/objects/...` path falls
 * through to the SPA and returns HTML, which silently fails to decode as an
 * image — the cause of the missing thumbnails).
 */
export function resolveImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/objects/")) {
    const key = url.slice("/objects/".length);
    return `${API_BASE}/api/objects/serve/${encodeURIComponent(key)}`;
  }
  // `/api/...` and other absolute paths are served as-is.
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  // Bare relative keys are object-storage keys behind the serve route.
  return `${API_BASE}/api/objects/serve/${encodeURIComponent(url)}`;
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "" || v === false) continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

async function apiGet<T>(path: string): Promise<T> {
  // No credentials: this is a public-browsing companion (no auth session).
  // Sending credentials with a wildcard CORS origin is rejected by browsers
  // on the Expo web build, and native clients don't need cookies here.
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

// ---- Push notifications ----

/** Upload an Expo push token so the backend can notify this device. */
export function registerPushToken(
  token: string,
  platform?: "ios" | "android" | "web",
): Promise<{ ok: boolean; id?: string }> {
  return apiPost("/api/push/register", { token, platform });
}

/** Opt this device out of push notifications. */
export function unregisterPushToken(token: string): Promise<{ ok: boolean }> {
  return apiPost("/api/push/unregister", { token });
}

/**
 * Resolve the in-app navigation target for a tapped notification's data
 * payload. The backend sends `{ promptId, url }`; we prefer an explicit
 * promptId, then fall back to a known in-app path.
 */
export function deepLinkTarget(
  data: Record<string, unknown> | undefined | null,
): string | null {
  if (!data) return null;
  if (typeof data.promptId === "string" && data.promptId) {
    return `/prompt/${data.promptId}`;
  }
  if (typeof data.url === "string" && data.url.startsWith("/")) {
    return data.url;
  }
  return null;
}

// ---- Types (mirror the shared web schema fields the mobile app reads) ----

export interface PromptUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  profileImageUrl?: string | null;
}

export interface Prompt {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  promptType?: string | null;
  promptStyle?: string | null;
  tags?: string[] | null;
  promptContent?: string | null;
  negativePrompt?: string | null;
  exampleImagesUrl?: string[] | null;
  likes?: number | null;
  usageCount?: number | null;
  intendedGenerator?: string | null;
  recommendedModels?: string[] | null;
  isFeatured?: boolean | number | null;
  isPublic?: boolean | null;
  isNsfw?: boolean | null;
  license?: string | null;
  sourceUrl?: string | null;
  createdAt?: string | null;
  user?: PromptUser | null;
  userId?: string | null;
}

export interface CodexCategory {
  id: string;
  name: string;
  termCount?: number;
  subcategories?: string[];
  anatomyGroup?: string;
}

export interface CodexTerm {
  id: string;
  term: string;
  description?: string | null;
  category?: string | null;
  subcategory?: string | null;
  isNsfw?: boolean;
  type?: string;
}

export interface PromptQuery {
  search?: string;
  category?: string;
  type?: string;
  generator?: string;
  sortBy?: "trending" | "recent" | "featured";
  isFeatured?: boolean;
  limit?: number;
  offset?: number;
}

function promptPath(q: PromptQuery): string {
  return `/api/prompts${qs({
    isPublic: true,
    search: q.search,
    category: q.category,
    type: q.type,
    generator: q.generator,
    sortBy: q.sortBy,
    isFeatured: q.isFeatured,
    limit: q.limit ?? 30,
    offset: q.offset,
  })}`;
}

// ---- Hooks ----

// The public API serves NSFW prompts to unauthenticated callers (server gates
// NSFW only by an authenticated user's preference). This companion is a public
// browser, so we filter NSFW client-side. We also apply the "trending" ordering
// client-side because the server ignores sortBy and always returns updatedAt
// desc. Filtering/sorting happens in `select` so pagination (which keys off raw
// page lengths in getNextPageParam) is unaffected.
function refinePrompts(prompts: Prompt[], sortBy?: PromptQuery["sortBy"]): Prompt[] {
  const safe = prompts.filter((p) => !p.isNsfw);
  if (sortBy === "trending") {
    return [...safe].sort(
      (a, b) =>
        (b.likes ?? 0) + (b.usageCount ?? 0) - ((a.likes ?? 0) + (a.usageCount ?? 0)),
    );
  }
  return safe;
}

export function usePrompts(q: PromptQuery) {
  const path = promptPath(q);
  return useQuery<Prompt[], Error, Prompt[]>({
    queryKey: [path],
    queryFn: () => apiGet<Prompt[]>(path),
    select: (data) => refinePrompts(data, q.sortBy),
  });
}

const PAGE_SIZE = 20;

export function useInfinitePrompts(q: Omit<PromptQuery, "offset" | "limit">) {
  return useInfiniteQuery<
    Prompt[],
    Error,
    InfiniteData<Prompt[]>,
    [string, Omit<PromptQuery, "offset" | "limit">],
    number
  >({
    queryKey: ["infinite-prompts", q],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      apiGet<Prompt[]>(promptPath({ ...q, limit: PAGE_SIZE, offset: pageParam })),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE,
    select: (data) => ({
      ...data,
      pages: data.pages.map((page) => refinePrompts(page, q.sortBy)),
    }),
  });
}

export function usePrompt(id?: string) {
  return useQuery<Prompt>({
    queryKey: [`/api/prompts/${id}`],
    queryFn: () => apiGet<Prompt>(`/api/prompts/${id}`),
    enabled: !!id,
  });
}

export function useCodexCategories() {
  return useQuery<CodexCategory[]>({
    queryKey: ["/api/codex/categories"],
    queryFn: () => apiGet<CodexCategory[]>("/api/codex/categories"),
  });
}

export function useCodexTerms(categoryId?: string, search?: string) {
  const path = `/api/codex/terms${qs({
    categoryId,
    search,
    limit: 80,
  })}`;
  return useQuery<CodexTerm[]>({
    queryKey: [path],
    queryFn: () => apiGet<CodexTerm[]>(path),
    enabled: !!categoryId || !!(search && search.length > 1),
  });
}

// ---- Helpers ----

export function displayName(user?: PromptUser | null): string {
  if (!user) return "Community";
  if (user.username) return user.username;
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return full || "Community";
}

export function initials(user?: PromptUser | null): string {
  const name = displayName(user);
  return name.slice(0, 1).toUpperCase();
}

// ---- AI tools (public, no-auth endpoints) ----

export type LlmProvider = "openai" | "google";

export interface EnhancePromptInput {
  prompt: string;
  llmProvider?: LlmProvider;
  llmModel?: string;
  useHappyTalk?: boolean;
  customBasePrompt?: string;
  subject?: string;
  character?: { name: string; description?: string };
}

export interface EnhancePromptResult {
  success: boolean;
  enhancedPrompt: string;
  metadata?: { provider?: string; model?: string };
}

/**
 * Enhance / generate a prompt via the public enhance-prompt endpoint.
 * Defaults to Gemini, which is the configured/working provider here; callers
 * can still override `llmProvider`/`llmModel` (the server allowlists models).
 */
export function enhancePrompt(input: EnhancePromptInput): Promise<EnhancePromptResult> {
  return apiPost<EnhancePromptResult>("/api/enhance-prompt", {
    llmProvider: "google",
    llmModel: "gemini-2.5-flash",
    ...input,
  });
}

export interface MinerInput {
  taskType: "text" | "image";
  name: string;
  data?: string; // text content (taskType "text")
  base64?: string; // base64 image payload (taskType "image")
  mimeType?: string;
}

export interface MinedPrompt {
  id: string;
  title: string;
  content: string;
  negativePrompt?: string;
  model?: string;
  tags?: string[];
  source?: string;
  images?: string[];
}

/** Extract structured prompts from pasted text or an image via PromptMiner. */
export function minerAnalyze(input: MinerInput): Promise<{ prompts: MinedPrompt[] }> {
  if (input.taskType === "image") {
    const mimeType = input.mimeType ?? "image/jpeg";
    const raw = input.base64 ?? "";
    // The server's `/analyze` contract uses taskType "file" for binary uploads
    // and extracts the payload via `dataUrl.split(",")[1]`, so it needs a
    // data-URL prefix. expo-image-picker returns bare base64 without one.
    const base64 = raw.startsWith("data:") ? raw : `data:${mimeType};base64,${raw}`;
    return apiPost<{ prompts: MinedPrompt[] }>("/api/prompt-miner/analyze", {
      taskType: "file",
      name: input.name,
      mimeType,
      base64,
    });
  }
  return apiPost<{ prompts: MinedPrompt[] }>("/api/prompt-miner/analyze", {
    taskType: "text",
    name: input.name,
    data: input.data,
  });
}

export interface PromptTemplate {
  id: string;
  name: string;
  description?: string | null;
  template_type?: string | null;
  master_prompt?: string | null;
  llm_provider?: string | null;
  llm_model?: string | null;
  use_happy_talk?: boolean | null;
  compress_prompt?: boolean | null;
  compression_level?: string | null;
}

export function useTemplates() {
  return useQuery<PromptTemplate[]>({
    queryKey: ["/api/system-data/prompt-templates"],
    queryFn: () => apiGet<PromptTemplate[]>("/api/system-data/prompt-templates"),
  });
}

export interface CharacterPreset {
  id: string;
  name: string;
  gender?: string | null;
  role?: string | null;
  description?: string | null;
}

export function usePresets() {
  return useQuery<CharacterPreset[]>({
    queryKey: ["/api/system-data/character-presets"],
    queryFn: () => apiGet<CharacterPreset[]>("/api/system-data/character-presets"),
  });
}
