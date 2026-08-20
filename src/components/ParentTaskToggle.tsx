// src/components/ParentTaskToggle.tsx
'use client'

import { useState } from 'react'

export default function ParentTaskToggle({
  taskId,
  taskTitle,
  taskStatus,
  childrenCount,
  doneChildrenCount,
  children,
}: {
  taskId: string
  taskTitle: string
  taskStatus: string
  childrenCount: number
  doneChildrenCount: number
  children: React.ReactNode
}) {
  const isDone = taskStatus === 'DONE'
  const [isOpen, setIsOpen] = useState(!isDone)

  if (isDone) {
    return (
      <div className="border border-gray-700 rounded-lg overflow-hidden opacity-60">
        <div
          className="cursor-pointer select-none bg-slate-800/80 hover:bg-slate-700/80 transition-colors"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <div className="px-3 py-2 flex items-center gap-2">
            <span
              className={`text-gray-500 transition-transform duration-200 text-xs ${
                isOpen ? 'rotate-90' : ''
              }`}
            >
              ▶
            </span>
            <span className="text-green-400 text-xs">✓</span>
            <h3 className="text-sm line-through text-gray-500 truncate">
              {taskTitle}
            </h3>
            {childrenCount > 0 && (
              <span className="text-[10px] text-gray-500 bg-gray-700/40 px-1.5 py-0.5 rounded-full shrink-0">
                {doneChildrenCount}/{childrenCount}
              </span>
            )}
          </div>
        </div>
        <div
          className={`transition-all duration-200 ease-in-out overflow-hidden ${
            isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="border border-blue-700 rounded-lg overflow-hidden">
      <div
        className="cursor-pointer select-none transition-colors bg-slate-900/70"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <div className="p-4 flex items-center gap-3">
          <span
            className={`text-gray-400 transition-transform duration-200 text-sm ${
              isOpen ? 'rotate-90' : ''
            }`}
          >
            ▶
          </span>
          <h3 className="font-bold text-lg text-white">
            {taskTitle}
          </h3>
          {childrenCount > 0 && (
            <span className="text-xs text-gray-400 bg-gray-700/60 px-2 py-0.5 rounded-full">
              {doneChildrenCount}/{childrenCount}
            </span>
          )}
        </div>
      </div>
      <div
        className={`transition-all duration-200 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {children}
      </div>
    </div>
  )
}
