// src/components/NewTaskForm.tsx
'use client'

import { createTask } from '@/app/actions/create-actions'
import { useState } from 'react'
import { createPortal } from 'react-dom'

export default function NewTaskForm({ projectId }: { projectId: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn btn-primary text-sm w-full"
      >
        ＋ 新しいタスクを追加
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="modal-backdrop">
          <div className="modal-card max-h-[calc(100vh-2rem)] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">新しいタスク</h3>
            <form action={createTask} onSubmit={() => setIsOpen(false)}>
              {/* どのプロジェクトに追加するかを識別するための隠し項目 */}
              <input type="hidden" name="projectId" value={projectId} />

              {/* タスク名 */}
              <input
                name="title"
                type="text"
                placeholder="タスク名を入力..."
                required
                className="form-control mb-3"
              />

              {/* ▼ 追加: 日付入力 */}
              <input 
                type="date" 
                name="startDate"
                className="form-control mb-3 [scheme:dark]"
              />
              <input 
                type="date" 
                name="dueDate"
                className="form-control mb-3 [scheme:dark]"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                {/* PM力強化ポイント：重要度・緊急度・見積もりを最初に入力させる */}
                <select name="importance" className="form-control flex-1" defaultValue="3">
                  <option value="5">重要度: 高 (5)</option>
                  <option value="3">重要度: 中 (3)</option>
                  <option value="1">重要度: 低 (1)</option>
                </select>

                <select name="urgency" className="form-control flex-1" defaultValue="3">
                  <option value="5">緊急度: 高 (5)</option>
                  <option value="3">緊急度: 中 (3)</option>
                  <option value="1">緊急度: 低 (1)</option>
                </select>
              </div>

              <input
                name="estimatedMinutes"
                type="number"
                placeholder="見積(分)"
                className="form-control mb-4"
              />

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn btn-secondary"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  追加する
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
