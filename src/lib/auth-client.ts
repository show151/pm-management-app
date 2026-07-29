// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

const baseURL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// タイムアウト付きfetchラッパー
async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒タイムアウト

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
      cache: "no-cache",
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    customFetchImpl: fetchWithTimeout,
  },
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;