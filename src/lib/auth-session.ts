// src/lib/auth-session.ts
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  emailVerified?: boolean;
};

/**
 * サーバー側で現在のセッションを取得する
 * 未ログインの場合は null を返す
 */
export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    return null;
  }

  return session;
}

/**
 * サーバー側で現在のユーザーを取得する
 * 未ログインの場合は null を返す
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const result = await getSession();
  return result?.user ?? null;
}

/**
 * サーバー側で現在のユーザーを取得する（未ログインで例外をスロー）
 */
export async function getAuthUserOrThrow(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}