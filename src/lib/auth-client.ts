// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

// ブラウザの現在のURLをベースURLとして使用（Vercel対応）
const baseURL = typeof window !== "undefined"
  ? window.location.origin
  : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");

export const authClient = createAuthClient({
  baseURL,
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;