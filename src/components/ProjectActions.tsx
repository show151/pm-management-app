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
      <div
        className="modal-backdrop"
        onClick={(e) => {
          e.stopPropagation()
          setIsEditing(false)
        }}
      >
        <div
          className="modal-card max-w-sm max-h-[calc(100vh-2rem)] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="form-control mb-2 text-lg font-semibold"
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="form-control mb-2 resize-none"
            rows={2}
          />
          <div className="mb-3">
            <label className="text-xs text-gray-300 block mb-1">開始日</label>
            <input
              type="date"
              value={editStartDate}
              onChange={(e) => setEditStartDate(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="form-control [color-scheme:dark]"
            />
          </div>
          <div className="mb-3">
            <label className="text-xs text-gray-300 block mb-1">期限日</label>
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="form-control [color-scheme:dark]"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleUpdate}
              className="btn btn-primary text-xs"
            >
              保存
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsEditing(false)
              }}
              className="btn btn-secondary text-xs"
            >
              キャンセル
            </button>
          </div>
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
        className="btn btn-primary btn-icon"
        title="編集"
      >
        ✏️
      </button>
      <button
        onClick={handleDelete}
        disabled={!canDelete}
        className="btn btn-danger btn-icon"
        title="削除"
      >
        🗑️
      </button>
    </div>
  )
}
