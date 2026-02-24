// src/app/login/page.tsx
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'

// ログイン処理（Server Action）
async function signIn(formData: FormData) {
  'use server'
  const usernameInput = ((formData.get('username') as string) || '').trim()
  const emailInput = ((formData.get('email') as string) || '').trim()
  const loginInput = usernameInput || emailInput
  const password = formData.get('password') as string
  const supabase = await createClient()
  let email = loginInput

  if (!loginInput) {
    return redirect(`/login?message=${encodeURIComponent('メールアドレスまたはユーザー名を入力してください')}`)
  }
  if (!password) {
    return redirect(`/login?message=${encodeURIComponent('パスワードを入力してください')}`)
  }

  // ユーザー名でのログインを許可するため、メールに解決する
  if (!loginInput.includes('@')) {
    const matchedUsers = await prisma.user.findMany({
      where: {
        name: { equals: loginInput, mode: 'insensitive' },
      },
      select: { email: true },
      take: 2,
    })

    if (matchedUsers.length === 0) {
      return redirect(`/login?message=${encodeURIComponent('ユーザーが見つかりませんでした')}`)
    }

    if (matchedUsers.length > 1) {
      return redirect(`/login?message=${encodeURIComponent('同名ユーザーが複数います。メールアドレスでログインしてください')}`)
    }

    email = matchedUsers[0].email
  }

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
  const email = ((formData.get('email') as string) || '').trim()
  const password = formData.get('password') as string
  const usernameInput = (formData.get('username') as string | null)?.trim() ?? ''
  const supabase = await createClient()

  if (!email || !email.includes('@')) {
    return redirect(`/login?message=${encodeURIComponent('新規登録はメールアドレスで行ってください')}`)
  }
  const fallbackName = email?.split('@')[0] || 'New User'
  const username = usernameInput || fallbackName

  const { data, error } = await supabase.auth.signUp({
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

  if (data.user?.id && data.user.email) {
    await prisma.user.upsert({
      where: { id: data.user.id },
      update: {
        email: data.user.email,
        name: username,
      },
      create: {
        id: data.user.id,
        email: data.user.email,
        name: username,
      },
    })
  }

  // 開発環境向け：メール確認をスキップしてログインできている場合もあるためリダイレクト
  return redirect(`/?message=${encodeURIComponent('確認メールをチェックしてください')}`)
}

export default async function Login({ searchParams }: { searchParams: Promise<{ message: string }> }) {
  const params = await searchParams

  return (
    <main className="app-shell flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="ui-panel-accent">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-white">PM-Master</h1>
            <p className="mt-2 text-sm text-gray-200">ログインまたは新規登録</p>
          </div>

          <form className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-white block mb-2" htmlFor="username">ユーザーネーム（ログイン/新規登録）</label>
              <input
                className="form-control"
                name="username"
                placeholder="例: show5"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white block mb-2" htmlFor="email">メールアドレス</label>
              <input
                className="form-control"
                name="email"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white block mb-2" htmlFor="password">パスワード</label>
              <input
                className="form-control"
                type="password"
                name="password"
                placeholder="••••••••"
                required
              />
            </div>
            
            <div className="flex flex-col gap-3 mt-2">
              <button formAction={signIn} formNoValidate className="btn btn-primary w-full">
                ログイン
              </button>
              <button formAction={signUp} className="btn btn-secondary w-full">
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
            
            {params?.message && (
              <p className="mt-2 rounded-lg border border-red-500/60 bg-red-900/55 p-3 text-center text-sm text-red-200">
                {params.message}
              </p>
            )}
          </form>
        </div>
      </div>
    </main>
  )
}
