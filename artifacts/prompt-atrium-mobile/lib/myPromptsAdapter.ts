import { useMemo } from "react";
import { ServerAdapter } from "@workspace/prompt-crud";
import { API_BASE } from "./api";
import { useAuth } from "./authContext";

/**
 * Returns a ServerAdapter pre-configured with the current session token.
 * Returns null when the user is not authenticated so callers can gate CRUD.
 */
export function useMyPromptsAdapter(): ServerAdapter | null {
  const { token } = useAuth();
  return useMemo(() => {
    if (!token) return null;
    return new ServerAdapter({
      apiBase: API_BASE,
      getToken: () => token,
    });
  }, [token]);
}
