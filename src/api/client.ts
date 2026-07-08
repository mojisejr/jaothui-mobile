import type { MobileResponse } from "@/types/mobile-api";

const DEFAULT_API_BASE_URL = "http://localhost:3020";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_JAOTHUI_API_BASE_URL?.replace(/\/$/, "") || DEFAULT_API_BASE_URL;

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

export async function mobileGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
    },
  });
  const payload = (await response.json()) as MobileResponse<T>;

  if (!payload.ok) {
    throw new MobileApiError(payload.error.message, payload.error.code, response.status);
  }

  return payload.data;
}
