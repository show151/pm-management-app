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
        className="btn btn-secondary text-xs"
      >
        ユーザー名編集
      </button>

      {isOpen && (
        <div className="modal-backdrop">
          <div className="modal-card max-w-sm max-h-[calc(100vh-2rem)] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-3">ユーザーネーム編集</h3>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-control"
              placeholder="ユーザーネーム"
            />
            {message && <p className="text-xs text-white mt-2">{message}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn btn-secondary"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="btn btn-primary"
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
