// src/components/NewProjectButton.tsx
'use client'

import { createProject } from '@/app/actions/create-actions'
import { useState } from 'react'

export default function NewProjectButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="border-2 border-white text-white font-bold px-4 py-2 rounded hover:bg-white hover:text-blue-600 transition-all"
      >
        + 新しいプロジェクト
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-blue-500 to-pink-500 p-6 rounded-xl shadow-lg border border-blue-400 w-96">
            <h3 className="text-xl font-bold text-white mb-4">新しいプロジェクト</h3>
            <form action={createProject} onSubmit={() => setIsOpen(false)}>
              <input
                name="title"
                type="text"
                placeholder="プロジェクト名"
                required
                className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <textarea
                name="description"
                placeholder="説明（任意）"
                className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                rows={3}
              />
              <input
                name="dueDate"
                type="date"
                className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-pink-500 [color-scheme:dark]"
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
                  作成
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
