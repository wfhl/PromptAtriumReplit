import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import * as crypto from "crypto";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

let _oidcConfigCache: { value: any; expiresAt: number } | null = null;
const getOidcConfig = async () => {
  const now = Date.now();
  if (_oidcConfigCache && _oidcConfigCache.expiresAt > now) {
    return _oidcConfigCache.value;
  }
  const value = await client.discovery(
    new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
    process.env.REPL_ID!
  );
  _oidcConfigCache = { value, expiresAt: now + 3600 * 1000 };
  return value;
};

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  /** Mobile deep-link scheme used in openAuthSessionAsync */
  const MOBILE_REDIRECT_SCHEME = "prompt-atrium-mobile://auth";

  app.get("/api/login", (req, res, next) => {
    // Persist the mobile-redirect flag so /api/callback can read it.
    // The flag travels in the express-session, which is maintained by the
    // browser throughout the OIDC redirect chain.
    if (req.query.mobile === "1") {
      (req.session as any).mobileRedirect = true;
    }
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    const isMobile = !!(req.session as any).mobileRedirect;

    passport.authenticate(
      `replitauth:${req.hostname}`,
      { session: true },
      (err: unknown, user: Express.User | false | null) => {
        if (err || !user) {
          const dest = isMobile
            ? `${MOBILE_REDIRECT_SCHEME}?error=auth_failed`
            : "/api/login";
          return res.redirect(dest);
        }

        req.logIn(user, (loginErr) => {
          if (loginErr) {
            const dest = isMobile
              ? `${MOBILE_REDIRECT_SCHEME}?error=login_failed`
              : "/api/login";
            return res.redirect(dest);
          }

          if (isMobile) {
            delete (req.session as any).mobileRedirect;
            const userId = (user as any).claims?.sub as string | undefined;
            if (userId) {
              const bearerToken = issueMobileToken(userId);
              return res.redirect(
                `${MOBILE_REDIRECT_SCHEME}?token=${encodeURIComponent(bearerToken)}`,
              );
            }
            return res.redirect(`${MOBILE_REDIRECT_SCHEME}?error=no_user`);
          }

          // Standard web flow
          res.redirect("/");
        });
      },
    )(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

// ---- Mobile bearer-token helpers ----

const MOBILE_TOKEN_TTL_SEC = 30 * 24 * 60 * 60; // 30 days

function getTokenSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not set");
  return s;
}

/**
 * Issue a mobile bearer token for an authenticated user.
 * Format: base64(userId:expiresAt):hmac
 */
export function issueMobileToken(userId: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + MOBILE_TOKEN_TTL_SEC;
  const payload = Buffer.from(`${userId}:${expiresAt}`).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getTokenSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

/**
 * Verify a mobile bearer token. Returns userId on success, null on failure.
 */
export function verifyMobileToken(token: string): string | null {
  try {
    const dot = token.lastIndexOf(".");
    if (dot < 0) return null;
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);

    const expectedSig = crypto
      .createHmac("sha256", getTokenSecret())
      .update(payload)
      .digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return null;
    }

    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    const [userId, expiresAtStr] = decoded.split(":");
    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Math.floor(Date.now() / 1000) > expiresAt) {
      return null;
    }
    return userId ?? null;
  } catch {
    return null;
  }
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Path 1: session-based (web app)
  const user = req.user as any;
  if (req.isAuthenticated() && user?.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    if (now <= user.expires_at) {
      return next();
    }
    // Try token refresh
    const refreshToken = user.refresh_token;
    if (refreshToken) {
      try {
        const config = await getOidcConfig();
        const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
        updateUserSession(user, tokenResponse);
        return next();
      } catch {
        // fall through to bearer check
      }
    }
  }

  // Path 2: mobile bearer token
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const userId = verifyMobileToken(token);
    if (userId) {
      try {
        const dbUser = await storage.getUser(userId);
        if (dbUser) {
          // Attach a minimal user object so existing handlers work
          (req as any).user = {
            claims: { sub: userId },
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          };
          return next();
        }
      } catch {
        // fall through
      }
    }
  }

  return res.status(401).json({ message: "Unauthorized" });
};
