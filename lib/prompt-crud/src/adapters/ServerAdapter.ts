import type {
  PromptCreateInput,
  PromptCrudAdapter,
  PromptCrudItem,
  ServerAdapterConfig,
} from "../types";

/**
 * ServerAdapter — talks to the PromptAtrium REST API over an injectable fetch.
 *
 * The fetch implementation, base URL, and auth headers are all injected so the
 * same adapter works from a browser (cookie session via `withCredentials`), a
 * native client (token header via `getAuthHeaders`), or tests (a stub fetch).
 * It targets the standard prompt routes: list via `listPath`
 * (default `/api/prompts/mine`), and `/api/prompts[/:id]` for the rest.
 */
export class ServerAdapter implements PromptCrudAdapter {
  private readonly config: ServerAdapterConfig;

  constructor(config: ServerAdapterConfig = {}) {
    this.config = config;
  }

  private get fetchImpl(): typeof fetch {
    const f = this.config.fetch ?? (globalThis.fetch as typeof fetch | undefined);
    if (!f) {
      throw new Error(
        "ServerAdapter requires a fetch implementation: none was injected and globalThis.fetch is unavailable.",
      );
    }
    return f;
  }

  private async request<T>(
    path: string,
    init?: { method?: string; body?: unknown },
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (init?.body !== undefined) headers["Content-Type"] = "application/json";
    if (this.config.getAuthHeaders) {
      Object.assign(headers, await this.config.getAuthHeaders());
    }
    const res = await this.fetchImpl(`${this.config.baseUrl ?? ""}${path}`, {
      method: init?.method ?? "GET",
      headers,
      ...(init?.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
      ...(this.config.withCredentials ? { credentials: "include" as const } : {}),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status}: ${text || res.statusText}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  list(params?: { search?: string }): Promise<PromptCrudItem[]> {
    const base = this.config.listPath ?? "/api/prompts/mine";
    const q = params?.search ? `?search=${encodeURIComponent(params.search)}` : "";
    return this.request<PromptCrudItem[]>(`${base}${q}`);
  }

  get(id: string): Promise<PromptCrudItem> {
    return this.request<PromptCrudItem>(`/api/prompts/${encodeURIComponent(id)}`);
  }

  create(input: PromptCreateInput): Promise<PromptCrudItem> {
    return this.request<PromptCrudItem>("/api/prompts", { method: "POST", body: input });
  }

  update(id: string, input: Partial<PromptCreateInput>): Promise<PromptCrudItem> {
    return this.request<PromptCrudItem>(`/api/prompts/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: input,
    });
  }

  async delete(id: string): Promise<void> {
    await this.request<void>(`/api/prompts/${encodeURIComponent(id)}`, { method: "DELETE" });
  }
}
