import { useCallback, useEffect, useReducer, useRef } from "react";
import type { PromptCreateInput, PromptCrudAdapter, PromptCrudItem } from "../types";

interface State {
  items: PromptCrudItem[];
  loading: boolean;
  error: string | null;
  mutating: boolean;
}

type Action =
  | { type: "LOAD_START" }
  | { type: "LOAD_OK"; items: PromptCrudItem[] }
  | { type: "LOAD_ERR"; error: string }
  | { type: "MUTATE_START" }
  | { type: "MUTATE_OK" }
  | { type: "MUTATE_ERR"; error: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, loading: true, error: null };
    case "LOAD_OK":
      return { ...state, loading: false, items: action.items };
    case "LOAD_ERR":
      return { ...state, loading: false, error: action.error };
    case "MUTATE_START":
      return { ...state, mutating: true, error: null };
    case "MUTATE_OK":
      return { ...state, mutating: false };
    case "MUTATE_ERR":
      return { ...state, mutating: false, error: action.error };
    default:
      return state;
  }
}

const initial: State = { items: [], loading: false, error: null, mutating: false };

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

export function usePromptCrud(
  adapter: PromptCrudAdapter | null,
  initialSearch?: string,
): UsePromptCrudResult {
  const [state, dispatch] = useReducer(reducer, initial);
  const searchRef = useRef(initialSearch ?? "");

  const refresh = useCallback(
    (search?: string) => {
      if (!adapter) return;
      if (search !== undefined) searchRef.current = search;
      dispatch({ type: "LOAD_START" });
      adapter
        .list({ search: searchRef.current || undefined })
        .then((items) => dispatch({ type: "LOAD_OK", items }))
        .catch((err: unknown) =>
          dispatch({
            type: "LOAD_ERR",
            error: err instanceof Error ? err.message : "Failed to load",
          }),
        );
    },
    [adapter],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: PromptCreateInput): Promise<PromptCrudItem> => {
      if (!adapter) throw new Error("No adapter");
      dispatch({ type: "MUTATE_START" });
      try {
        const item = await adapter.create(input);
        dispatch({ type: "MUTATE_OK" });
        refresh();
        return item;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to create";
        dispatch({ type: "MUTATE_ERR", error: msg });
        throw err;
      }
    },
    [adapter, refresh],
  );

  const update = useCallback(
    async (id: string, input: Partial<PromptCreateInput>): Promise<PromptCrudItem> => {
      if (!adapter) throw new Error("No adapter");
      dispatch({ type: "MUTATE_START" });
      try {
        const item = await adapter.update(id, input);
        dispatch({ type: "MUTATE_OK" });
        refresh();
        return item;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to update";
        dispatch({ type: "MUTATE_ERR", error: msg });
        throw err;
      }
    },
    [adapter, refresh],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      if (!adapter) throw new Error("No adapter");
      dispatch({ type: "MUTATE_START" });
      try {
        await adapter.delete(id);
        dispatch({ type: "MUTATE_OK" });
        refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to delete";
        dispatch({ type: "MUTATE_ERR", error: msg });
        throw err;
      }
    },
    [adapter, refresh],
  );

  return {
    items: state.items,
    loading: state.loading,
    mutating: state.mutating,
    error: state.error,
    refresh,
    create,
    update,
    remove,
  };
}
