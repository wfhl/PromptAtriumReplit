import type { AuthConfig, PromptCreateInput, PromptCrudAdapter, PromptCrudItem } from "../types";

function qs(params: Record<string, string | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

async function buildHeaders(auth: AuthConfig): Promise<Record<string, string>> {
  const token = await auth.getToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function apiFetch<T>(
  auth: AuthConfig,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const base = auth.apiBase ?? "";
  const headers = await buildHeaders(auth);
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

/**
 * ServerAdapter — fetches the authenticated user's own prompts from
 * GET /api/prompts/mine (a protected endpoint; user ID is derived server-side
 * from the session/token, so the client cannot request another user's private
 * prompts).
 */
export class ServerAdapter implements PromptCrudAdapter {
  constructor(private auth: AuthConfig) {}

  async list(params?: { search?: string }): Promise<PromptCrudItem[]> {
    const q = qs({ search: params?.search });
    return apiFetch<PromptCrudItem[]>(this.auth, "GET", `/api/prompts/mine${q}`);
  }

  async get(id: string): Promise<PromptCrudItem> {
    return apiFetch<PromptCrudItem>(this.auth, "GET", `/api/prompts/${id}`);
  }

  async create(input: PromptCreateInput): Promise<PromptCrudItem> {
    return apiFetch<PromptCrudItem>(this.auth, "POST", "/api/prompts", input);
  }

  async update(id: string, input: Partial<PromptCreateInput>): Promise<PromptCrudItem> {
    return apiFetch<PromptCrudItem>(this.auth, "PUT", `/api/prompts/${id}`, input);
  }

  async delete(id: string): Promise<void> {
    return apiFetch<void>(this.auth, "DELETE", `/api/prompts/${id}`);
  }
}
