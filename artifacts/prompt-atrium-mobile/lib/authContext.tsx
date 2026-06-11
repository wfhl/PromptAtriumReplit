import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { API_BASE } from "./api";

const TOKEN_KEY = "promptatrium.auth.token.v1";
const USER_KEY = "promptatrium.auth.user.v1";

/**
 * Deep-link scheme configured in app.json ("scheme": "prompt-atrium-mobile").
 * After a successful Replit Auth session, the server redirects to:
 *   prompt-atrium-mobile://auth?token=<bearer-token>
 * openAuthSessionAsync captures this redirect and returns the URL to us.
 */
const AUTH_REDIRECT_URI = "prompt-atrium-mobile://auth";

export interface AuthUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  profileImageUrl?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  ready: boolean;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => void;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchUser(token: string): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/user`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as AuthUser;
  } catch {
    return null;
  }
}

function parseTokenFromRedirect(url: string): string | null {
  try {
    const u = new URL(url);
    return u.searchParams.get("token");
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (storedToken) {
          setToken(storedToken);
          if (storedUser) {
            setUser(JSON.parse(storedUser) as AuthUser);
          }
          // Re-validate in background; clear if the token has expired
          fetchUser(storedToken).then((u) => {
            if (u) {
              setUser(u);
              AsyncStorage.setItem(USER_KEY, JSON.stringify(u)).catch(() => {});
            } else {
              setToken(null);
              setUser(null);
              AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]).catch(() => {});
            }
          });
        }
      } catch {
        // ignore corrupt storage
      }
      setReady(true);
    })();
  }, []);

  const login = useCallback(async () => {
    setLoading(true);
    try {
      /**
       * Open the Replit Auth login page with ?mobile=1 so the server knows to
       * redirect back to our deep-link scheme instead of "/".
       *
       * openAuthSessionAsync (SFSafariViewController on iOS, Custom Tabs on
       * Android) waits until the browser navigates to a URL starting with
       * AUTH_REDIRECT_URI and returns `{ type: "success", url }`.
       * This is the only reliable cross-platform approach — openBrowserAsync
       * returns immediately on Android, before auth is complete.
       */
      const loginUrl = `${API_BASE}/api/login?mobile=1`;
      const result = await WebBrowser.openAuthSessionAsync(
        loginUrl,
        AUTH_REDIRECT_URI,
      );

      if (result.type === "success" && result.url) {
        const newToken = parseTokenFromRedirect(result.url);
        if (newToken) {
          setToken(newToken);
          const u = await fetchUser(newToken);
          if (u) {
            setUser(u);
            await Promise.all([
              AsyncStorage.setItem(TOKEN_KEY, newToken),
              AsyncStorage.setItem(USER_KEY, JSON.stringify(u)),
            ]);
          } else {
            // Token issued but user fetch failed — clear
            setToken(null);
          }
        }
      }
      // type === "cancel" or "dismiss": user closed browser without finishing
    } catch {
      // ignore errors
    }
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]).catch(() => {});
    // Open logout in browser to end the Replit OIDC session
    WebBrowser.openBrowserAsync(`${API_BASE}/api/logout`).catch(() => {});
  }, []);

  const getToken = useCallback(() => token, [token]);

  return (
    <AuthContext.Provider value={{ user, token, ready, loading, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
