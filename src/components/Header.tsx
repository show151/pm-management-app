// src/components/Header.tsx
import { signOut } from '@/app/actions/modify-actions'

export default function Header({ email }: { email: string }) {
  return (
    <header className="flex flex-col md:flex-row justify-between items-center mb-8 bg-gradient-to-r from-blue-500 to-pink-500 p-4 rounded-xl shadow-lg border border-blue-400">
      <div className="flex items-center gap-2 mb-4 md:mb-0">
        <span className="text-2xl">🚀</span>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          PM-Master
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-xs text-gray-300">ログイン中</p>
          <p className="text-sm font-medium text-white">{email}</p>
        </div>

        <form action={signOut}>
          <button 
            type="submit" 
            className="text-xs font-bold text-white border border-gray-500 px-3 py-2 rounded hover:bg-gray-800 transition-colors"
          >
            ログアウト
          </button>
        </form>
      </div>
    </header>
  )
}