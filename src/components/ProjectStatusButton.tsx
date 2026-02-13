// src/components/ProjectStatusButton.tsx
'use client'

import { completeProject, reopenProject } from '@/app/actions/modify-actions'
import { useTransition } from 'react'

export default function ProjectStatusButton({ projectId, status }: { projectId: string, status: string }) {
  const [isPending, startTransition] = useTransition()
  const isCompleted = status === 'COMPLETED'

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    startTransition(async () => {
      if (isCompleted) {
        await reopenProject(projectId)
      } else {
        if (confirm('このプロジェクトを完了にしますか？')) {
          await completeProject(projectId)
        }
      }
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`text-xs font-bold px-3 py-1 rounded transition-all ${
        isCompleted
          ? 'bg-green-700 text-white border border-green-600 hover:bg-gray-700'
          : 'border-2 border-white text-white hover:bg-white hover:text-blue-600'
      }`}
    >
      {isPending ? '...' : isCompleted ? '✓ 完了済み' : '完了にする'}
    </button>
  )
}
