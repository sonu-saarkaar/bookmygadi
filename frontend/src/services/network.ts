const PRODUCTION_API_BASE_URL = "https://api.bookmygadi.app";

const getBrowserOrigin = (): string | null => {
  if (typeof window === "undefined") return null;
  return window.location.origin;
};

const normalizeBaseUrl = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

export const resolveApiBaseUrl = (envUrl?: string): string => {
  const configured = normalizeBaseUrl(envUrl || "");
  if (configured) return configured;

  const browserOrigin = getBrowserOrigin();
  if (browserOrigin?.includes("bookmygadi.app")) {
    return PRODUCTION_API_BASE_URL;
  }

  return "http://localhost:8000";
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
