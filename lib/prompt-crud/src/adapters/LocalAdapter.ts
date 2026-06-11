import type {
  KeyValueStore,
  PromptCreateInput,
  PromptCrudAdapter,
  PromptCrudItem,
} from "../types";

function makeId(): string {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function matchesSearch(item: PromptCrudItem, search?: string): boolean {
  const q = (search ?? "").trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    item.name,
    item.promptContent,
    item.description ?? "",
    item.category ?? "",
    item.promptType ?? "",
    ...(item.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function sortNewestFirst(a: PromptCrudItem, b: PromptCrudItem): number {
  const av = a.updatedAt ?? a.createdAt ?? "";
  const bv = b.updatedAt ?? b.createdAt ?? "";
  return bv.localeCompare(av);
}

/**
 * LocalAdapter — stores prompts entirely on-device through an injected
 * {@link KeyValueStore} (AsyncStorage in Expo/React Native, a `localStorage`
 * shim on web, or an in-memory map in tests).
 *
 * Used by PromptAtriumLite for a private, offline-first prompt library. The
 * storage key is configurable so multiple independent libraries can coexist
 * without collision.
 */
export class LocalAdapter implements PromptCrudAdapter {
  private readonly store: KeyValueStore;
  private readonly key: string;

  constructor(store: KeyValueStore, key = "lite_prompts") {
    this.store = store;
    this.key = key;
  }

  private async readAll(): Promise<PromptCrudItem[]> {
    const raw = await this.store.getItem(this.key);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as PromptCrudItem[]) : [];
    } catch {
      return [];
    }
  }

  private async writeAll(items: PromptCrudItem[]): Promise<void> {
    await this.store.setItem(this.key, JSON.stringify(items));
  }

  async list(params?: { search?: string }): Promise<PromptCrudItem[]> {
    const items = await this.readAll();
    return items.filter((it) => matchesSearch(it, params?.search)).sort(sortNewestFirst);
  }

  async get(id: string): Promise<PromptCrudItem> {
    const found = (await this.readAll()).find((it) => it.id === id);
    if (!found) throw new Error(`Prompt not found: ${id}`);
    return found;
  }

  async create(input: PromptCreateInput): Promise<PromptCrudItem> {
    const items = await this.readAll();
    const ts = nowIso();
    const item: PromptCrudItem = {
      id: makeId(),
      name: input.name,
      promptContent: input.promptContent,
      description: input.description ?? null,
      tags: input.tags ?? null,
      promptType: input.promptType ?? null,
      category: input.category ?? null,
      isPublic: input.isPublic ?? false,
      isNsfw: false,
      createdAt: ts,
      updatedAt: ts,
      userId: null,
    };
    items.push(item);
    await this.writeAll(items);
    return item;
  }

  async update(id: string, input: Partial<PromptCreateInput>): Promise<PromptCrudItem> {
    const items = await this.readAll();
    const idx = items.findIndex((it) => it.id === id);
    if (idx === -1) throw new Error(`Prompt not found: ${id}`);
    const next: PromptCrudItem = { ...items[idx], ...input, updatedAt: nowIso() };
    items[idx] = next;
    await this.writeAll(items);
    return next;
  }

  async delete(id: string): Promise<void> {
    const items = await this.readAll();
    await this.writeAll(items.filter((it) => it.id !== id));
  }

  /** Read the entire library — used by export. */
  async exportAll(): Promise<PromptCrudItem[]> {
    return this.readAll();
  }

  /**
   * Bring imported prompts into the library.
   *
   * - Default (`merge: false`): replace the entire library with `incoming`.
   * - `merge: true`: union by id with the existing library; incoming entries
   *   win on id collision, so re-importing the same export file is idempotent
   *   rather than duplicating or clobbering the user's prompts.
   */
  async importAll(incoming: PromptCrudItem[], opts?: { merge?: boolean }): Promise<void> {
    if (!opts?.merge) {
      await this.writeAll(incoming);
      return;
    }
    const byId = new Map<string, PromptCrudItem>();
    for (const it of await this.readAll()) byId.set(it.id, it);
    for (const it of incoming) byId.set(it.id, it);
    await this.writeAll([...byId.values()]);
  }
}
