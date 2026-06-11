import type { Prompt } from "./api";

/**
 * Helpers for prompts that exist only on the device (generated, mined, or
 * imported). They share the saved-library store, so they must look like
 * `Prompt`s but carry a `local-` id so the detail screen knows to read them
 * from AsyncStorage instead of hitting the server.
 */

let counter = 0;

export function localId(): string {
  counter += 1;
  return `local-${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeLocalPrompt(partial: Partial<Prompt> & { name: string }): Prompt {
  return {
    id: localId(),
    isPublic: false,
    isNsfw: false,
    ...partial,
  };
}

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function toTags(v: unknown): string[] | null {
  if (Array.isArray(v)) {
    const t = v.map((x) => str(x)).filter(Boolean);
    return t.length ? t : null;
  }
  if (typeof v === "string" && v.trim()) {
    const t = v
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    return t.length ? t : null;
  }
  return null;
}

/**
 * Best-effort mapping of an arbitrary imported record onto a Prompt. Accepts a
 * range of common key spellings (name/title, prompt/content, etc.). Returns
 * null when the record has neither a usable name nor body.
 */
export function normalizeToPrompt(rec: unknown): Prompt | null {
  if (!rec || typeof rec !== "object") return null;
  const r = rec as Record<string, unknown>;

  const name = str(r.name ?? r.title ?? r.Name ?? r.Title);
  const content = str(
    r.promptContent ?? r.prompt ?? r.content ?? r.text ?? r.Prompt ?? r.body,
  );
  if (!name && !content) return null;

  return makeLocalPrompt({
    name: name || content.slice(0, 60) || "Imported prompt",
    promptContent: content || null,
    description: str(r.description ?? r.Description ?? r.desc) || null,
    negativePrompt:
      str(r.negativePrompt ?? r.negative_prompt ?? r.negative ?? r.Negative) || null,
    category: str(r.category ?? r.Category) || null,
    promptType: str(r.promptType ?? r.type ?? r.Type) || null,
    tags: toTags(r.tags ?? r.Tags ?? r.keywords),
    intendedGenerator:
      str(r.intendedGenerator ?? r.generator ?? r.model ?? r.Model) || null,
    sourceUrl: str(r.sourceUrl ?? r.source_url ?? r.url ?? r.URL) || null,
  });
}
