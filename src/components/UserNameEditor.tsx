'use client'

import { updateUserName } from '@/app/actions/modify-actions'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  currentName: string
}

export default function UserNameEditor({ currentName }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState(currentName)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateUserName(name)
      setMessage(result.message)
      if (result.ok) {
        setIsOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-xs font-bold text-white border border-gray-500 px-3 py-2 rounded hover:bg-gray-800 transition-colors"
      >
        ユーザー名編集
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 px-3 py-4 sm:items-center sm:py-8 overflow-y-auto">
          <div className="w-full max-w-sm bg-gradient-to-br from-blue-500 to-pink-500 p-5 rounded-xl border border-blue-400 max-h-[calc(100vh-2rem)] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-3">ユーザーネーム編集</h3>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md px-3 py-2 bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              placeholder="ユーザーネーム"
            />
            {message && <p className="text-xs text-white mt-2">{message}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-2 text-sm text-white hover:bg-white hover:bg-opacity-20 rounded transition-all"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="border-2 border-white text-white font-bold px-3 py-2 rounded hover:bg-white hover:text-blue-600 transition-all disabled:opacity-50"
              >
                {isPending ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
