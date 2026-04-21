const DEFAULT_API_BASE_URL = "http://localhost";

const normalizeBaseUrl = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

export const resolveApiBaseUrl = (envUrl?: string): string => {
  const fallback = normalizeBaseUrl(envUrl || DEFAULT_API_BASE_URL) || DEFAULT_API_BASE_URL;

  return fallback;
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