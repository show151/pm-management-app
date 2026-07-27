'use client'

import { addProjectMember, removeProjectMember, searchProjectShareCandidates } from '@/app/actions/modify-actions'
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
  memberStats?: Record<string, { activeTaskCount: number; totalEstimatedMinutes: number }>
}

const LOAD_LIMIT_MINUTES = 2400 // 40 hours

export default function ProjectMembersPanel({ projectId, owner, members, isOwner, memberStats = {} }: Props) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Member[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleAddMemberByEmail = () => {
    startTransition(async () => {
      const result = await addProjectMember(projectId, query)
      setMessage(result.message)
      if (result.ok) {
        setQuery('')
        setSearchResults([])
      }
    })
  }

  const handleSearch = () => {
    startTransition(async () => {
      const result = await searchProjectShareCandidates(projectId, query)
      if (!result.ok) {
        setMessage('候補検索に失敗しました。')
        return
      }
      setSearchResults(result.candidates)
      setMessage(result.candidates.length === 0 ? '候補が見つかりませんでした。' : null)
    })
  }

  const handleAddFromCandidate = (candidate: Member) => {
    startTransition(async () => {
      const result = await addProjectMember(projectId, candidate.email)
      setMessage(result.message)
      if (result.ok) {
        setSearchResults((prev) => prev.filter((user) => user.id !== candidate.id))
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
    <section className="ui-panel rounded-xl p-4 space-y-3">
      <h2 className="text-base font-bold text-white">メンバー</h2>

      <div className="text-sm text-gray-200">
        <span className="font-semibold">オーナー:</span> {owner.email}
        {memberStats[owner.id] && (
          <div className="mt-1 text-xs text-gray-400">
            進行中タスク: {memberStats[owner.id].activeTaskCount}件 
            / 予定: {memberStats[owner.id].totalEstimatedMinutes}分
            {memberStats[owner.id].totalEstimatedMinutes > LOAD_LIMIT_MINUTES && (
              <span className="ml-2 text-red-400 font-bold" title="想定作業時間（40h）を超過しています">⚠️ 負荷高</span>
            )}
          </div>
        )}
      </div>

      {members.length > 0 ? (
        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between rounded px-3 py-2 border border-gray-700 bg-slate-900/50">
              <div className="text-sm text-gray-100 flex-1">
                {member.email}
                {memberStats[member.id] && (
                  <div className="mt-1 text-xs text-gray-400">
                    進行中タスク: {memberStats[member.id].activeTaskCount}件 
                    / 予定: {memberStats[member.id].totalEstimatedMinutes}分
                    {memberStats[member.id].totalEstimatedMinutes > LOAD_LIMIT_MINUTES && (
                      <span className="ml-2 text-red-400 font-bold" title="想定作業時間（40h）を超過しています">⚠️ 負荷高</span>
                    )}
                  </div>
                )}
              </div>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member)}
                  disabled={isPending}
                  className="btn btn-danger text-xs px-2 py-1"
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
        <>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="名前またはメールで検索"
              className="form-control flex-1"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={isPending || !query.trim()}
              className="btn btn-secondary text-xs"
            >
              検索
            </button>
            <button
              type="button"
              onClick={handleAddMemberByEmail}
              disabled={isPending || !query.trim()}
              className="btn btn-primary text-xs"
            >
              メールで直接追加
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((candidate) => (
                <div key={candidate.id} className="flex items-center justify-between rounded px-3 py-2 border border-gray-700 bg-slate-900/50">
                  <div className="text-sm text-gray-100">
                    <p className="font-medium">{candidate.name || '(名前未設定)'}</p>
                    <p className="text-xs text-gray-400">{candidate.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddFromCandidate(candidate)}
                    disabled={isPending}
                    className="btn btn-primary text-xs px-2 py-1"
                  >
                    追加
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {message && <p className="text-xs text-gray-300">{message}</p>}
    </section>
  )
}
