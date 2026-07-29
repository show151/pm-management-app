// src/components/LoginForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const loginInput = (username.trim() || email.trim()).trim();
    if (!loginInput) {
      setMessage("メールアドレスまたはユーザー名を入力してください");
      setLoading(false);
      return;
    }
    if (!password) {
      setMessage("パスワードを入力してください");
      setLoading(false);
      return;
    }

    // ユーザー名でログインする場合、メールアドレスに解決する
    let loginEmail = loginInput;
    if (!loginInput.includes("@")) {
      try {
        const res = await fetch(
          `/api/users/resolve-email?username=${encodeURIComponent(loginInput)}`
        );
        if (res.status === 404) {
          setMessage("ユーザーが見つかりませんでした");
          setLoading(false);
          return;
        }
        if (res.status === 409) {
          setMessage("同名ユーザーが複数います。メールアドレスでログインしてください");
          setLoading(false);
          return;
        }
        if (!res.ok) {
          setMessage("ログインに失敗しました");
          setLoading(false);
          return;
        }
        const data = await res.json();
        loginEmail = data.email;
      } catch {
        setMessage("ログインに失敗しました");
        setLoading(false);
        return;
      }
    }

    const result = await authClient.signIn.email({
      email: loginEmail,
      password,
    });

    if (result.error) {
      console.error("Login error:", result.error);
      const errorMsg = result.error.message || "ログインに失敗しました";
      setMessage(errorMsg);
      setLoading(false);
      return;
    }

    // フルページリロードで遷移（クッキーを確実にサーバーに送信するため）
    window.location.href = "/";
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const emailInput = email.trim();
    const usernameInput = username.trim();
    if (!emailInput || !emailInput.includes("@")) {
      setMessage("新規登録はメールアドレスで行ってください");
      setLoading(false);
      return;
    }
    if (!password) {
      setMessage("パスワードを入力してください");
      setLoading(false);
      return;
    }

    const fallbackName = emailInput.split("@")[0] || "New User";
    const name = usernameInput || fallbackName;

    const signUpResult = await authClient.signUp.email({
      email: emailInput,
      password,
      name,
    });

    if (signUpResult.error) {
      console.error("Sign up error:", signUpResult.error);
      const errMsg = signUpResult.error.message || "登録できませんでした";
      if (errMsg.includes("already") || errMsg.includes("exists")) {
        setMessage("そのメールアドレスは既に登録されています");
      } else {
        setMessage(errMsg);
      }
      setLoading(false);
      return;
    }

    // 新規登録後、自動ログインされる（autoSignIn: true）
    // フルページリロードで遷移（クッキーを確実にサーバーに送信するため）
    window.location.href = "/";
  }

  return (
    <div className="w-full max-w-md">
      <div className="ui-panel-accent">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-white">PM-Master</h1>
          <p className="mt-2 text-sm text-gray-200">ログインまたは新規登録</p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="text-sm font-medium text-white block mb-2" htmlFor="username">
              ユーザーネーム（ログイン/新規登録）
            </label>
            <input
              className="form-control"
              name="username"
              placeholder="例: show5"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white block mb-2" htmlFor="email">
              メールアドレス
            </label>
            <input
              className="form-control"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white block mb-2" htmlFor="password">
              パスワード
            </label>
            <input
              className="form-control"
              type="password"
              name="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <button
              onClick={handleSignIn}
              disabled={loading}
              formNoValidate
              className="btn btn-primary w-full"
            >
              {loading ? "処理中..." : "ログイン"}
            </button>
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="btn btn-secondary w-full"
            >
              新規登録
            </button>
            <Link
              href="/guest"
              className="btn w-full border-emerald-300/80 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
            >
              ゲストログイン
            </Link>
            <p className="text-xs text-gray-300 text-center">
              ゲストデータはブラウザを閉じると消えます。
            </p>
          </div>

          {message && (
            <p className="mt-2 rounded-lg border border-red-500/60 bg-red-900/55 p-3 text-center text-sm text-red-200">
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}