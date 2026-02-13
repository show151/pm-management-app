// src/components/TaskStatusButton.tsx
'use client'

import { completeTask, undoTask } from '@/app/actions/modify-actions'
import { useState, useTransition } from 'react'

type Props = {
  taskId: string
  status: string
  actualMinutes?: number | null
  estimatedMinutes?: number | null
  reflection?: string | null
  isSubTask?: boolean
}

export default function TaskStatusButton({ taskId, status, actualMinutes, estimatedMinutes, reflection, isSubTask = false }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isInputting, setIsInputting] = useState(false)
  const [showReflection, setShowReflection] = useState(false)
  
  const [minutes, setMinutes] = useState(estimatedMinutes || 30)
  const [reflectionText, setReflectionText] = useState('')

  const isDone = status === 'DONE'

  const handleStartComplete = () => {
    setIsInputting(true)
  }

  const handleConfirm = () => {
    startTransition(async () => {
      await completeTask(taskId, Number(minutes), isSubTask ? '' : reflectionText)
      setIsInputting(false)
    })
  }

  const handleUndo = () => {
    if(!confirm('タスクを未完了に戻しますか？')) return
    startTransition(async () => {
      await undoTask(taskId)
    })
  }

  if (isDone) {
    return (
      <>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={isPending}
            className="text-xs bg-green-700 text-white border border-green-600 px-3 py-1 rounded hover:bg-red-700 hover:border-red-600 transition-colors"
          >
            {isPending ? '...' : `✓ 完了 (実績: ${actualMinutes}分)`}
          </button>
          {reflection && (
            <button
              onClick={() => setShowReflection(true)}
              className="text-xs bg-blue-700 text-white border border-blue-600 px-2 py-1 rounded hover:bg-blue-600 transition-colors"
            >
              📝 振り返り
            </button>
          )}
        </div>
        
        {showReflection && reflection && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-blue-500 to-pink-500 p-6 rounded-xl shadow-lg border border-blue-400 w-96">
              <h3 className="text-xl font-bold text-white mb-4">振り返り</h3>
              <div className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 text-sm mb-4">
                <p className="text-white whitespace-pre-wrap">{reflection}</p>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowReflection(false)}
                  className="px-4 py-2 text-sm text-white hover:bg-white hover:bg-opacity-20 rounded transition-all"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="relative">
      {isInputting && isSubTask && (
        <div className="absolute bottom-full right-0 mb-2 z-50 bg-gradient-to-br from-blue-500 to-pink-500 p-4 rounded-xl shadow-xl border border-blue-400 w-64">
          <h3 className="text-sm font-bold text-white mb-3">タスクの完了</h3>
          
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-xs text-white">実績時間:</span>
            <input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="w-20 border border-gray-600 bg-gray-700 text-white rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-pink-500"
              autoFocus
            />
            <span className="text-xs text-white">分</span>
          </div>
          
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setIsInputting(false)}
              className="px-3 py-1 text-xs text-white hover:bg-white hover:bg-opacity-20 rounded transition-all"
            >
              キャンセル
            </button>
            <button
              onClick={handleConfirm}
              disabled={isPending}
              className="border-2 border-white text-white font-bold px-3 py-1 rounded hover:bg-white hover:text-blue-600 transition-all text-xs"
            >
              {isPending ? '...' : '完了'}
            </button>
          </div>
        </div>
      )}

      {isInputting && !isSubTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-blue-500 to-pink-500 p-6 rounded-xl shadow-lg border border-blue-400 w-96">
            <h3 className="text-xl font-bold text-white mb-4">タスクの振り返り</h3>
            
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-white">実績時間:</span>
              <input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="w-20 border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-pink-500"
                autoFocus
              />
              <span className="text-sm text-white">分</span>
            </div>

            <textarea
              placeholder="一言メモ: なぜ早く/遅く終わった？"
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
              rows={4}
            />
            
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setIsInputting(false)}
                className="px-4 py-2 text-sm text-white hover:bg-white hover:bg-opacity-20 rounded transition-all"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="border-2 border-white text-white font-bold px-4 py-2 rounded hover:bg-white hover:text-blue-600 transition-all text-sm"
              >
                {isPending ? '...' : '確定して完了'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <button
        onClick={handleStartComplete}
        className="px-3 py-1 text-xs font-bold rounded border bg-gray-700 text-white border-gray-600 hover:bg-gradient-to-r hover:from-blue-500 hover:to-pink-500 hover:border-pink-400 transition-all"
      >
        完了にする
      </button>
    </div>
  )
}