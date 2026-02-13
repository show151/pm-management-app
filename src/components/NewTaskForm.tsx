// src/components/NewTaskForm.tsx
'use client'

import { createTask } from '@/app/actions/create-actions'
import { useState } from 'react'

export default function NewTaskForm({ projectId }: { projectId: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="border-2 border-white text-white font-bold px-4 py-2 rounded hover:bg-white hover:text-blue-600 transition-all text-sm w-full"
      >
        ＋ 新しいタスクを追加
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-blue-500 to-pink-500 p-6 rounded-xl shadow-lg border border-blue-400 w-96">
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
                className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />

              {/* ▼ 追加: 日付入力 */}
              <input 
                type="date" 
                name="dueDate"
                className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-pink-500 [color-scheme:dark]"
              />

              <div className="flex gap-2 mb-3">
                {/* PM力強化ポイント：重要度・緊急度・見積もりを最初に入力させる */}
                <select name="importance" className="flex-1 border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" defaultValue="3">
                  <option value="5">重要度: 高 (5)</option>
                  <option value="3">重要度: 中 (3)</option>
                  <option value="1">重要度: 低 (1)</option>
                </select>

                <select name="urgency" className="flex-1 border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" defaultValue="3">
                  <option value="5">緊急度: 高 (5)</option>
                  <option value="3">緊急度: 中 (3)</option>
                  <option value="1">緊急度: 低 (1)</option>
                </select>
              </div>

              <input
                name="estimatedMinutes"
                type="number"
                placeholder="見積(分)"
                className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm text-white hover:bg-white hover:bg-opacity-20 rounded transition-all"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="border-2 border-white text-white font-bold px-4 py-2 rounded hover:bg-white hover:text-blue-600 transition-all"
                >
                  追加する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}