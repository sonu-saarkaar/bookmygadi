const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

const normalizeBaseUrl = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

export const resolveApiBaseUrl = (envUrl?: string): string => {
  const fallback = normalizeBaseUrl(envUrl || DEFAULT_API_BASE_URL) || DEFAULT_API_BASE_URL;

  if (typeof window === "undefined") {
    return fallback;
  }

  const host = window.location.hostname?.trim();
  if (!host || host === "localhost" || host === "127.0.0.1" || host === "[::1]") {
    return fallback;
  }

  const protocol = window.location.protocol === "https:" ? "https" : "http";
  return `${protocol}://${host}:8000`;
};

export const toWebSocketUrl = (apiBaseUrl: string, path: string): string | null => {
  try {
    const wsUrl = new URL(apiBaseUrl);
    wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
    wsUrl.pathname = path.startsWith("/") ? path : `/${path}`;
    wsUrl.search = "";
    wsUrl.hash = "";
    return wsUrl.toString();
  } catch {
    return null;
  }
};