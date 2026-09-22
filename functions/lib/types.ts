/**
 * Minimal structural types for the bindings the contribute path uses.
 *
 * Deliberately not `@cloudflare/workers-types`: that package declares globals
 * that collide with the DOM lib this app already compiles against. The Pages
 * runtime wires handlers by export name, so these types exist for our own
 * checking only.
 */
export interface CounterNamespace {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
}

export interface Env {
  RATE_LIMIT: CounterNamespace;
  TURNSTILE_SECRET: string;
  /** Public Turnstile site key, handed to the browser by /api/config. */
  TURNSTILE_SITE_KEY?: string;
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
  /** Overridable so the pull-request path can be exercised against a stub. */
  GITHUB_API?: string;
}

export interface PagesContext {
  request: Request;
  env: Env;
  /** Dynamic route segments, e.g. `id` for `/api/admin/contribution/:id`. */
  params?: Record<string, string>;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function missingConfiguration(env: Env): string | null {
  if (!env.RATE_LIMIT) return "The rate limiter is not connected yet.";
  if (!env.TURNSTILE_SECRET) return "The bot challenge is not configured yet.";
  return null;
}
