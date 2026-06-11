import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import type { Prompt } from "./api";

const STORAGE_KEY = "promptatrium.saved.v1";

interface SavedContextValue {
  saved: Prompt[];
  ready: boolean;
  isSaved: (id: string) => boolean;
  toggle: (prompt: Prompt) => void;
  remove: (id: string) => void;
  /** Add (or move to top) a single prompt — used by Generate/Miner/Import. */
  add: (prompt: Prompt) => void;
  /** Add many prompts at once, de-duplicating by id — used by Import. */
  addMany: (prompts: Prompt[]) => void;
}

const SavedContext = createContext<SavedContextValue | null>(null);

export function SavedProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<Prompt[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setSaved(JSON.parse(raw) as Prompt[]);
      } catch {
        // ignore corrupt storage
      }
      setReady(true);
    })();
  }, []);

  const persist = useCallback((next: Prompt[]) => {
    setSaved(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const isSaved = useCallback(
    (id: string) => saved.some((p) => p.id === id),
    [saved],
  );

  const toggle = useCallback(
    (prompt: Prompt) => {
      setSaved((prev) => {
        const exists = prev.some((p) => p.id === prompt.id);
        const next = exists
          ? prev.filter((p) => p.id !== prompt.id)
          : [{ ...prompt }, ...prev];
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

  const remove = useCallback(
    (id: string) => {
      setSaved((prev) => {
        const next = prev.filter((p) => p.id !== id);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

  const add = useCallback((prompt: Prompt) => {
    setSaved((prev) => {
      const next = [{ ...prompt }, ...prev.filter((p) => p.id !== prompt.id)];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const addMany = useCallback((prompts: Prompt[]) => {
    setSaved((prev) => {
      const incoming = new Map(prompts.map((p) => [p.id, p]));
      // New items first, then existing ones not being replaced.
      const next = [
        ...prompts.map((p) => ({ ...p })),
        ...prev.filter((p) => !incoming.has(p.id)),
      ];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return (
    <SavedContext.Provider
      value={{ saved, ready, isSaved, toggle, remove, add, addMany }}
    >
      {children}
    </SavedContext.Provider>
  );
}

export function useSaved(): SavedContextValue {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error("useSaved must be used within a SavedProvider");
  return ctx;
}
