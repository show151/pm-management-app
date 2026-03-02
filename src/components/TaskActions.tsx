// src/components/TaskActions.tsx
'use client'

import { deleteTask, updateTaskDetails } from '@/app/actions/modify-actions'
import { useState } from 'react'
import { createPortal } from 'react-dom'

type TaskActionsProps = {
  taskId: string
  title: string
  importance?: number
  urgency?: number
  estimatedMinutes?: number | null
  startDate?: Date | null
  dueDate?: Date | null
  assigneeId?: string | null
  assigneeOptions?: Array<{ id: string; label: string }>
  isSubTask?: boolean
}

export default function TaskActions({
  taskId,
  title,
  importance = 3,
  urgency = 3,
  estimatedMinutes,
  startDate,
  dueDate,
  assigneeId,
  assigneeOptions = [],
  isSubTask = false,
}: TaskActionsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(title)
  const [editImportance, setEditImportance] = useState(importance)
  const [editUrgency, setEditUrgency] = useState(urgency)
  const [editEstimatedMinutes, setEditEstimatedMinutes] = useState(estimatedMinutes || 0)
  const [editStartDate, setEditStartDate] = useState(startDate ? new Date(startDate).toISOString().split('T')[0] : '')
  const [editDueDate, setEditDueDate] = useState(dueDate ? new Date(dueDate).toISOString().split('T')[0] : '')
  const [editAssigneeId, setEditAssigneeId] = useState(assigneeId || '')

  const handleDelete = async () => {
    if (!confirm('このタスクを削除しますか？')) return
    await deleteTask(taskId)
  }

  const handleUpdate = async () => {
    if (!editTitle.trim()) return
    await updateTaskDetails(
      taskId,
      editTitle,
      editImportance,
      editUrgency,
      editEstimatedMinutes,
      editStartDate,
      editDueDate,
      editAssigneeId
    )
    setIsEditing(false)
  }

  if (isEditing) {
    if (typeof document === 'undefined') return null
    return createPortal(
      <div className="modal-backdrop" onClick={() => setIsEditing(false)}>
        <div className="modal-card max-h-[calc(100vh-2rem)] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-white mb-4">タスク編集</h3>
          
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="form-control mb-3"
            placeholder="タスク名"
            autoFocus
          />
          
          {!isSubTask && (
            <div className="mb-3">
              <label className="text-xs text-gray-300 block mb-1">開始日</label>
              <input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="form-control [color-scheme:dark]"
              />
            </div>
          )}

          <div className="mb-3">
            <label className="text-xs text-gray-300 block mb-1">期限日</label>
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="form-control [color-scheme:dark]"
            />
          </div>
          
          {!isSubTask && (
            <>
              <div className="mb-3">
                <label className="text-xs text-gray-300 block mb-1">重要度: {editImportance}</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={editImportance}
                  onChange={(e) => setEditImportance(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div className="mb-3">
                <label className="text-xs text-gray-300 block mb-1">緊急度: {editUrgency}</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={editUrgency}
                  onChange={(e) => setEditUrgency(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </>
          )}
          
          <div className="mb-4">
            <label className="text-xs text-gray-300 block mb-1">見積時間（分）</label>
            <input
              type="number"
              value={editEstimatedMinutes}
              onChange={(e) => setEditEstimatedMinutes(Number(e.target.value))}
              className="form-control"
            />
          </div>

          <div className="mb-4">
            <label className="text-xs text-gray-300 block mb-1">担当者</label>
            <select
              value={editAssigneeId}
              onChange={(e) => setEditAssigneeId(e.target.value)}
              className="form-control"
            >
              <option value="">未割当</option>
              {assigneeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setIsEditing(false)}
              className="btn btn-secondary"
            >
              キャンセル
            </button>
            <button
              onClick={handleUpdate}
              className="btn btn-primary"
            >
              保存
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  return (
    <div className="flex gap-1 text-xs">
      <button
        onClick={() => setIsEditing(true)}
        className="btn btn-secondary btn-icon h-7 w-7 text-xs"
        title="編集"
      >
        ✏️
      </button>
      <button
        onClick={handleDelete}
        className="btn btn-danger btn-icon h-7 w-7 text-xs"
        title="削除"
      >
        🗑️
      </button>
    </div>
  )
}
