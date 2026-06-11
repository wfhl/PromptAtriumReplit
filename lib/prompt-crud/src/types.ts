/**
 * Shared prompt-CRUD contracts.
 *
 * The lib is deliberately storage- and transport-agnostic: it defines a small
 * adapter interface and ships two implementations (local-on-device and remote
 * REST). Consumers inject their own storage primitive and/or fetch so the lib
 * never hard-depends on AsyncStorage or a particular auth scheme.
 */

/** A prompt as the CRUD surface sees it. IDs are opaque strings. */
export interface PromptCrudItem {
  id: string;
  name: string;
  promptContent: string;
  description?: string | null;
  tags?: string[] | null;
  promptType?: string | null;
  category?: string | null;
  isPublic?: boolean | null;
  isNsfw?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  userId?: string | null;
}

/** Fields accepted when creating or updating a prompt. */
export interface PromptCreateInput {
  name: string;
  promptContent: string;
  description?: string;
  tags?: string[];
  promptType?: string;
  category?: string;
  isPublic?: boolean;
}

/** The CRUD operations every adapter implements. */
export interface PromptCrudAdapter {
  list(params?: { search?: string }): Promise<PromptCrudItem[]>;
  get(id: string): Promise<PromptCrudItem>;
  create(input: PromptCreateInput): Promise<PromptCrudItem>;
  update(id: string, input: Partial<PromptCreateInput>): Promise<PromptCrudItem>;
  delete(id: string): Promise<void>;
}

/**
 * Minimal async key/value store injected into {@link LocalAdapter}.
 *
 * `@react-native-async-storage/async-storage` satisfies this shape exactly, as
 * does a thin wrapper over `localStorage` or an in-memory map for tests — so
 * the lib never depends on a specific storage package.
 */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** Injectable fetch implementation (defaults to the global `fetch`). */
export type FetchLike = typeof fetch;

/** Configuration for {@link ServerAdapter}. Everything is injectable. */
export interface ServerAdapterConfig {
  /** Absolute base URL prefixed to every request path. Defaults to "". */
  baseUrl?: string;
  /** Injectable fetch. Defaults to `globalThis.fetch` when omitted. */
  fetch?: FetchLike;
  /** Async hook returning extra request headers (e.g. an Authorization token). */
  getAuthHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  /** Send cookies with requests (browser cookie-session auth). Default false. */
  withCredentials?: boolean;
  /** Path the `list` call hits. Defaults to "/api/prompts/mine". */
  listPath?: string;
}

/**
 * Token-based auth shape kept for callers that prefer it over
 * {@link ServerAdapterConfig.getAuthHeaders}.
 */
export interface AuthConfig {
  getToken: () => string | null | Promise<string | null>;
  apiBase?: string;
}
