'use client'

import { addProjectMember, removeProjectMember } from '@/app/actions/modify-actions'
import { useState, useTransition } from 'react'

type Member = {
  id: string
  email: string
  name: string | null
}

type Props = {
  projectId: string
  owner: Member
  members: Member[]
  isOwner: boolean
}

export default function ProjectMembersPanel({ projectId, owner, members, isOwner }: Props) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleAddMember = () => {
    startTransition(async () => {
      const result = await addProjectMember(projectId, email)
      setMessage(result.message)
      if (result.ok) {
        setEmail('')
      }
    })
  }

  const handleRemoveMember = (member: Member) => {
    if (!confirm(`${member.email} をメンバーから外しますか？`)) return

    startTransition(async () => {
      const result = await removeProjectMember(projectId, member.id)
      setMessage(result.message)
    })
  }

  return (
    <section className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
      <h2 className="text-base font-bold text-white">メンバー</h2>

      <div className="text-sm text-gray-200">
        <span className="font-semibold">オーナー:</span> {owner.email}
      </div>

      {members.length > 0 ? (
        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded px-3 py-2">
              <div className="text-sm text-gray-100">
                {member.email}
              </div>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member)}
                  disabled={isPending}
                  className="text-xs text-red-300 hover:text-red-200"
                >
                  削除
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">まだ共有メンバーはいません。</p>
      )}

      {isOwner && (
        <div className="flex gap-2 pt-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="追加するユーザーのメール"
            className="flex-1 border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleAddMember}
            disabled={isPending || !email.trim()}
            className="border-2 border-white text-white font-bold px-3 py-2 text-xs rounded hover:bg-white hover:text-blue-600 transition-all disabled:opacity-50"
          >
            追加
          </button>
        </div>
      )}

      {message && <p className="text-xs text-gray-300">{message}</p>}
    </section>
  )
}
