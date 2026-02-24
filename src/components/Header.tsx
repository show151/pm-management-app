// src/components/Header.tsx
import { signOut } from '@/app/actions/modify-actions'
import UserNameEditor from '@/components/UserNameEditor'

export default function Header({ email, name }: { email: string, name: string }) {
  return (
    <header className="ui-panel-accent flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2">
        <span className="text-2xl">📝</span>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          PM-Management-App
        </h1>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-white">{name}</p>
          <p className="text-xs text-gray-300">ログイン中</p>
          <p className="text-sm font-medium text-white">{email}</p>
        </div>

        <UserNameEditor currentName={name} />

        <form action={signOut}>
          <button 
            type="submit" 
            className="btn btn-secondary text-xs"
          >
            ログアウト
          </button>
        </form>
      </div>
    </header>
  )
}
