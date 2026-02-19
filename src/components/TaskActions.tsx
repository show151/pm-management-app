// src/components/TaskActions.tsx
'use client'

import { deleteTask, updateTaskDetails } from '@/app/actions/modify-actions'
import { useState } from 'react'

type TaskActionsProps = {
  taskId: string
  title: string
  importance?: number
  urgency?: number
  estimatedMinutes?: number | null
  startDate?: Date | null
  dueDate?: Date | null
}

export default function TaskActions({ taskId, title, importance = 3, urgency = 3, estimatedMinutes, startDate, dueDate }: TaskActionsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(title)
  const [editImportance, setEditImportance] = useState(importance)
  const [editUrgency, setEditUrgency] = useState(urgency)
  const [editEstimatedMinutes, setEditEstimatedMinutes] = useState(estimatedMinutes || 0)
  const [editStartDate, setEditStartDate] = useState(startDate ? new Date(startDate).toISOString().split('T')[0] : '')
  const [editDueDate, setEditDueDate] = useState(dueDate ? new Date(dueDate).toISOString().split('T')[0] : '')

  const handleDelete = async () => {
    if (!confirm('このタスクを削除しますか？')) return
    await deleteTask(taskId)
  }

  const handleUpdate = async () => {
    if (!editTitle.trim()) return
    await updateTaskDetails(taskId, editTitle, editImportance, editUrgency, editEstimatedMinutes, editStartDate, editDueDate)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 px-3 py-4 sm:items-center sm:py-8 overflow-y-auto" onClick={() => setIsEditing(false)}>
        <div className="bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-600 w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-white mb-4">タスク編集</h3>
          
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="タスク名"
            autoFocus
          />
          
          <div className="mb-3">
            <label className="text-xs text-gray-300 block mb-1">開始日</label>
            <input
              type="date"
              value={editStartDate}
              onChange={(e) => setEditStartDate(e.target.value)}
              className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 [color-scheme:dark]"
            />
          </div>

          <div className="mb-3">
            <label className="text-xs text-gray-300 block mb-1">期限日</label>
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 [color-scheme:dark]"
            />
          </div>
          
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
          
          <div className="mb-4">
            <label className="text-xs text-gray-300 block mb-1">見積時間（分）</label>
            <input
              type="number"
              value={editEstimatedMinutes}
              onChange={(e) => setEditEstimatedMinutes(Number(e.target.value))}
              className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white"
            >
              キャンセル
            </button>
            <button
              onClick={handleUpdate}
              className="border-2 border-white text-white font-bold px-4 py-2 text-sm rounded hover:bg-white hover:text-blue-600 transition-all"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-1 text-xs">
      <button
        onClick={() => setIsEditing(true)}
        className="text-gray-400 hover:text-white px-1"
        title="編集"
      >
        ✏️
      </button>
      <button
        onClick={handleDelete}
        className="text-gray-400 hover:text-red-400 px-1"
        title="削除"
      >
        🗑️
      </button>
    </div>
  )
}
