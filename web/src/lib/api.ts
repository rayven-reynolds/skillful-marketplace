/**
 * Thin JSON client for the proxied Eventsee API (``/api/v1`` → FastAPI ``/v1``).
 */

const API_PREFIX = "/api/v1";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Perform a credentialed JSON request against the local API proxy.
 *
 * @param path - API path beginning with ``/`` (e.g. ``/public/planners``).
 * @param init - Optional fetch init; ``credentials`` defaults to ``include``.
 * @returns Parsed JSON body.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_PREFIX}${path}`;
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, {
    ...init,
    headers,
    credentials: init?.credentials ?? "include",
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(text || res.statusText) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
