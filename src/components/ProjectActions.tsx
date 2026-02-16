// src/components/ProjectActions.tsx
'use client'

import { deleteProject, updateProject } from '@/app/actions/modify-actions'
import { useState } from 'react'

export default function ProjectActions({ projectId, title, description, startDate, dueDate, canDelete = true }: { projectId: string, title: string, description: string, startDate: Date | null, dueDate: Date | null, canDelete?: boolean }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(title)
  const [editDescription, setEditDescription] = useState(description)
  const [editStartDate, setEditStartDate] = useState(startDate ? new Date(startDate).toISOString().split('T')[0] : '')
  const [editDueDate, setEditDueDate] = useState(dueDate ? new Date(dueDate).toISOString().split('T')[0] : '')

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('このプロジェクトを削除しますか？関連するタスクも全て削除されます。')) return
    await deleteProject(projectId)
  }

  const handleUpdate = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await updateProject(projectId, editTitle, editDescription, editStartDate, editDueDate)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="absolute top-2 right-2 sm:top-6 sm:right-6 p-3 sm:p-4 bg-gray-800 rounded-lg border border-gray-600 w-[calc(100vw-3rem)] max-w-sm z-10" onClick={(e) => e.stopPropagation()}>
        <input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 text-lg font-semibold mb-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
        <textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
          rows={2}
        />
        <div className="mb-3">
          <label className="text-xs text-gray-300 block mb-1">開始日</label>
          <input
            type="date"
            value={editStartDate}
            onChange={(e) => setEditStartDate(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 [color-scheme:dark]"
          />
        </div>
        <div className="mb-3">
          <label className="text-xs text-gray-300 block mb-1">期限日</label>
          <input
            type="date"
            value={editDueDate}
            onChange={(e) => setEditDueDate(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 [color-scheme:dark]"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleUpdate}
            className="border-2 border-white text-white font-bold px-3 py-1 text-xs rounded hover:bg-white hover:text-blue-600 transition-all"
          >
            保存
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(false)
            }}
            className="text-xs text-gray-300 hover:text-white px-3 py-1"
          >
            キャンセル
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsEditing(true)
        }}
        className="text-lg bg-blue-600 hover:bg-blue-700 text-white w-8 h-8 rounded-lg transition-all flex items-center justify-center"
        title="編集"
      >
        ✏️
      </button>
      <button
        onClick={handleDelete}
        disabled={!canDelete}
        className="text-lg bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded-lg transition-all flex items-center justify-center"
        title="削除"
      >
        🗑️
      </button>
    </div>
  )
}
