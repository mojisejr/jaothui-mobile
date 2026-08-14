import type { MobileResponse } from "@/types/mobile-api";

const DEFAULT_API_BASE_URL = "http://localhost:3020";

export function resolveApiBaseUrl(
  localE2eApiBaseUrl?: string,
  configuredApiBaseUrl?: string
) {
  return (
    localE2eApiBaseUrl?.replace(/\/$/, "") ||
    configuredApiBaseUrl?.replace(/\/$/, "") ||
    DEFAULT_API_BASE_URL
  );
}

// Keep this separate from the normal public API setting. Expo's development
// environment can load .env after shell variables, so the dedicated key gives
// disposable local E2E Metro sessions deterministic precedence without
// changing internal or production builds.
export const API_BASE_URL = resolveApiBaseUrl(
  process.env.EXPO_PUBLIC_JAOTHUI_LOCAL_E2E_API_BASE_URL,
  process.env.EXPO_PUBLIC_JAOTHUI_API_BASE_URL
);

type MobileRequestOptions = {
  method?: "DELETE" | "GET" | "POST";
  body?: unknown;
  bearerToken?: string | null;
};

export class MobileApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "MobileApiError";
    this.code = code;
    this.status = status;
  }
}

function buildHeaders(options: MobileRequestOptions) {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Cache-Control": "no-cache",
  };

  if (options.method === "POST") {
    headers["Content-Type"] = "application/json";
  }

  if (options.bearerToken) {
    headers.Authorization = `Bearer ${options.bearerToken}`;
  }

  return headers;
}

export async function mobileRequest<T>(
  path: string,
  options: MobileRequestOptions = {}
): Promise<T> {
  const method = options.method ?? "GET";
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    cache: "no-store",
    headers: buildHeaders({ ...options, method }),
    body: method === "POST" ? JSON.stringify(options.body ?? {}) : undefined,
  });
  let payload: MobileResponse<T>;
  try {
    payload = (await response.json()) as MobileResponse<T>;
  } catch {
    throw new MobileApiError(
      "JAOTHUI mobile API returned an unreadable response",
      "UNREADABLE_RESPONSE",
      response.status
    );
  }

  if (!payload.ok) {
    throw new MobileApiError(payload.error.message, payload.error.code, response.status);
  }

  return payload.data;
}

export function mobileGet<T>(path: string): Promise<T> {
  return mobileRequest<T>(path);
}

export function mobilePost<T>(path: string, body: unknown): Promise<T> {
  return mobileRequest<T>(path, { method: "POST", body });
}

export function mobilePostWithAuth<T>(
  path: string,
  body: unknown,
  bearerToken?: string | null
): Promise<T> {
  return mobileRequest<T>(path, { method: "POST", body, bearerToken });
}

export function mobileGetWithAuth<T>(path: string, bearerToken?: string | null): Promise<T> {
  return mobileRequest<T>(path, { bearerToken });
}

export function mobileDeleteWithAuth<T>(path: string, bearerToken?: string | null): Promise<T> {
  return mobileRequest<T>(path, { method: "DELETE", bearerToken });
}
