// src/app/login/page.tsx
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'

// ログイン処理（Server Action）
async function signIn(formData: FormData) {
  'use server'
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return redirect(`/login?message=${encodeURIComponent('ログインに失敗しました')}`)
  }

  return redirect('/')
}

// 新規登録処理（Server Action）
async function signUp(formData: FormData) {
  'use server'
  const origin = (await headers()).get('origin')
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const usernameInput = (formData.get('username') as string | null)?.trim() ?? ''
  const supabase = await createClient()
  const fallbackName = email?.split('@')[0] || 'New User'
  const username = usernameInput || fallbackName

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: username,
      },
      emailRedirectTo: `${origin}/auth/callback`, // 本来はメール確認が必要ですが今回は省略
    },
  })

  if (error) {
    console.error(error)
    if (error.message.includes('rate limit')) {
      return redirect(`/login?message=${encodeURIComponent('メール送信の制限に達しました。しばらく待ってから再度お試しください')}`)
    }
    return redirect(`/login?message=${encodeURIComponent('登録できませんでした')}`)
  }

  // 開発環境向け：メール確認をスキップしてログインできている場合もあるためリダイレクト
  return redirect(`/?message=${encodeURIComponent('確認メールをチェックしてください')}`)
}

export default async function Login({ searchParams }: { searchParams: Promise<{ message: string }> }) {
  const params = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="bg-gradient-to-br from-blue-500 to-pink-500 p-8 rounded-xl shadow-lg border border-blue-400">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-3xl">🚀</span>
            <h1 className="text-3xl font-bold text-white">PM-Master</h1>
          </div>
          
          <form className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-white block mb-2" htmlFor="username">ユーザーネーム（新規登録時）</label>
              <input
                className="w-full rounded-md px-4 py-2 bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                name="username"
                placeholder="例: show5"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white block mb-2" htmlFor="email">メールアドレス</label>
              <input
                className="w-full rounded-md px-4 py-2 bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                name="email"
                placeholder="you@example.com"
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-white block mb-2" htmlFor="password">パスワード</label>
              <input
                className="w-full rounded-md px-4 py-2 bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                type="password"
                name="password"
                placeholder="••••••••"
                required
              />
            </div>
            
            <div className="flex flex-col gap-3 mt-2">
              <button formAction={signIn} className="border-2 border-white text-white font-bold px-4 py-2 rounded hover:bg-white hover:text-blue-600 transition-all">
                ログイン
              </button>
              <button formAction={signUp} className="bg-gray-800 text-white font-medium px-4 py-2 rounded hover:bg-gray-700 transition-all">
                新規登録
              </button>
              <Link
                href="/guest"
                className="text-center bg-white text-blue-700 font-bold px-4 py-2 rounded hover:bg-gray-100 transition-all"
              >
                ゲストログイン
              </Link>
              <p className="text-xs text-gray-200 text-center">
                ゲストデータはブラウザを閉じると消えます。
              </p>
            </div>
            
            {params?.message && (
              <p className="mt-2 p-3 bg-red-900 text-red-200 text-center rounded text-sm border border-red-700">
                {params.message}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
