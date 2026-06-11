import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PromptCreateInput,
  PromptCrudAdapter,
  PromptCrudItem,
} from "../types";

export interface UsePromptCrudResult {
  items: PromptCrudItem[];
  loading: boolean;
  mutating: boolean;
  error: string | null;
  refresh: (search?: string) => void;
  create: (input: PromptCreateInput) => Promise<PromptCrudItem>;
  update: (id: string, input: Partial<PromptCreateInput>) => Promise<PromptCrudItem>;
  remove: (id: string) => Promise<void>;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * usePromptCrud — binds a {@link PromptCrudAdapter} to React state, exposing a
 * list plus create/update/remove mutators that refresh after each change.
 *
 * The adapter may be `null` (e.g. before storage is ready); calls no-op until
 * one is provided. `refresh(search)` re-runs the list with an optional query
 * that is remembered for subsequent automatic refreshes.
 */
export function usePromptCrud(
  adapter: PromptCrudAdapter | null,
  initialSearch = "",
): UsePromptCrudResult {
  const [items, setItems] = useState<PromptCrudItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef(initialSearch);

  const refresh = useCallback(
    (search?: string) => {
      if (search !== undefined) searchRef.current = search;
      if (!adapter) return;
      setLoading(true);
      setError(null);
      adapter
        .list({ search: searchRef.current })
        .then((res) => setItems(res))
        .catch((e) => setError(errMsg(e)))
        .finally(() => setLoading(false));
    },
    [adapter],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: PromptCreateInput): Promise<PromptCrudItem> => {
      if (!adapter) throw new Error("No adapter configured");
      setMutating(true);
      setError(null);
      try {
        const created = await adapter.create(input);
        refresh();
        return created;
      } catch (e) {
        setError(errMsg(e));
        throw e;
      } finally {
        setMutating(false);
      }
    },
    [adapter, refresh],
  );

  const update = useCallback(
    async (id: string, input: Partial<PromptCreateInput>): Promise<PromptCrudItem> => {
      if (!adapter) throw new Error("No adapter configured");
      setMutating(true);
      setError(null);
      try {
        const updated = await adapter.update(id, input);
        refresh();
        return updated;
      } catch (e) {
        setError(errMsg(e));
        throw e;
      } finally {
        setMutating(false);
      }
    },
    [adapter, refresh],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      if (!adapter) throw new Error("No adapter configured");
      setMutating(true);
      setError(null);
      try {
        await adapter.delete(id);
        refresh();
      } catch (e) {
        setError(errMsg(e));
        throw e;
      } finally {
        setMutating(false);
      }
    },
    [adapter, refresh],
  );

  return { items, loading, mutating, error, refresh, create, update, remove };
}
