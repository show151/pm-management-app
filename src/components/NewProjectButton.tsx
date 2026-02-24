// src/components/NewProjectButton.tsx
'use client'

import { createProject } from '@/app/actions/create-actions'
import { useState } from 'react'
import { createPortal } from 'react-dom'

export default function NewProjectButton({ className = '' }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const defaultButtonClass = 'btn btn-primary w-full sm:w-auto'

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={className || defaultButtonClass}
      >
        <span>＋</span>
        <span>新規プロジェクト</span>
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="modal-backdrop">
          <div className="modal-card max-h-[calc(100vh-2rem)] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">新しいプロジェクト</h3>
            <form action={createProject} onSubmit={() => setIsOpen(false)}>
              <input
                name="title"
                type="text"
                placeholder="プロジェクト名"
                required
                className="form-control mb-3"
              />
              <textarea
                name="description"
                placeholder="説明（任意）"
                className="form-control mb-3 resize-none"
                rows={3}
              />
              <label className="text-xs text-gray-300 block mb-1">開始日</label>
              <input
                name="startDate"
                type="date"
                className="form-control mb-3 [color-scheme:dark]"
              />
              <label className="text-xs text-gray-300 block mb-1">期限日</label>
              <input
                name="dueDate"
                type="date"
                className="form-control mb-4 [color-scheme:dark]"
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
                  作成
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
