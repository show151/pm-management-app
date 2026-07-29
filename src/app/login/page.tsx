// src/app/login/page.tsx
import LoginForm from "@/components/LoginForm";
import { getAuthUser } from "@/lib/auth-session";
import { redirect } from "next/navigation";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>;
}) {
  const params = await searchParams;

  // 既にログイン済みの場合はホームへリダイレクト
  const user = await getAuthUser();
  if (user) {
    redirect("/");
  }

  return (
    <main className="app-shell flex items-center justify-center">
      <LoginForm />
      {params?.message && (
        <p className="mt-2 rounded-lg border border-red-500/60 bg-red-900/55 p-3 text-center text-sm text-red-200">
          {params.message}
        </p>
      )}
    </main>
  );
}