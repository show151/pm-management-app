// src/components/TaskStatusButton.tsx
'use client'

import { completeTask, startTask, undoTask } from '@/app/actions/modify-actions'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'

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
  
  const [reflectionText, setReflectionText] = useState('')
  const [accumulatedMs, setAccumulatedMs] = useState(() => {
    if (typeof window === 'undefined' || !isSubTask || status === 'DONE') return 0
    try {
      const raw = localStorage.getItem(`subtask_timer_${taskId}`)
      if (!raw) return 0
      const parsed = JSON.parse(raw) as { accumulatedMs: number; runningSinceMs: number | null }
      return parsed.accumulatedMs || 0
    } catch {
      return 0
    }
  })
  const [runningSinceMs, setRunningSinceMs] = useState<number | null>(() => {
    if (typeof window === 'undefined' || !isSubTask || status === 'DONE') return null
    try {
      const raw = localStorage.getItem(`subtask_timer_${taskId}`)
      if (!raw) return null
      const parsed = JSON.parse(raw) as { accumulatedMs: number; runningSinceMs: number | null }
      return parsed.runningSinceMs ?? null
    } catch {
      return null
    }
  })
  const [nowMs, setNowMs] = useState(() => Date.now())

  const timerStorageKey = `subtask_timer_${taskId}`

  const isDone = status === 'DONE'
  const isInProgress = status === 'IN_PROGRESS'
  const isTodo = status === 'TODO'
  const isRunning = runningSinceMs !== null

  const elapsedMs = useMemo(() => {
    return accumulatedMs + (runningSinceMs ? nowMs - runningSinceMs : 0)
  }, [accumulatedMs, runningSinceMs, nowMs])

  const elapsedMinutesForComplete = elapsedMs > 0 ? Math.ceil(elapsedMs / 60000) : 0
  const elapsedMinutesView = Math.floor(elapsedMs / 60000)
  const elapsedSecondsView = Math.floor((elapsedMs % 60000) / 1000)

  useEffect(() => {
    if (!isSubTask || isDone) return
    localStorage.setItem(
      timerStorageKey,
      JSON.stringify({ accumulatedMs, runningSinceMs })
    )
  }, [isSubTask, isDone, timerStorageKey, accumulatedMs, runningSinceMs])

  useEffect(() => {
    if (!isRunning) return
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [isRunning])

  const handleStartComplete = () => {
    setIsInputting(true)
  }

  const handleConfirm = () => {
    startTransition(async () => {
      await completeTask(taskId, estimatedMinutes || 0, isSubTask ? '' : reflectionText)
      setIsInputting(false)
    })
  }

  const handleUndo = () => {
    if(!confirm('タスクを未完了に戻しますか？')) return
    startTransition(async () => {
      await undoTask(taskId)
    })
  }

  const handleStart = () => {
    startTransition(async () => {
      await startTask(taskId)
    })
  }

  const handleTimerStart = () => {
    startTransition(async () => {
      if (isTodo) {
        await startTask(taskId)
      }
      setNowMs(Date.now())
      setRunningSinceMs(Date.now())
    })
  }

  const handleTimerStop = () => {
    if (!runningSinceMs) return
    const stoppedAt = Date.now()
    setAccumulatedMs((prev) => prev + (stoppedAt - runningSinceMs))
    setRunningSinceMs(null)
    setNowMs(stoppedAt)
  }

  const handleTimerReset = () => {
    if (isRunning) return
    setAccumulatedMs(0)
    setNowMs(Date.now())
  }

  const handleSubTaskComplete = () => {
    const stoppedAt = Date.now()
    const finalElapsedMs = accumulatedMs + (runningSinceMs ? stoppedAt - runningSinceMs : 0)
    const finalMinutes = finalElapsedMs > 0 ? Math.ceil(finalElapsedMs / 60000) : 0

    startTransition(async () => {
      await completeTask(taskId, finalMinutes, '')
      localStorage.removeItem(timerStorageKey)
      setRunningSinceMs(null)
      setAccumulatedMs(0)
      setNowMs(Date.now())
    })
  }

  const handleStatusClick = () => {
    if (isTodo) {
      handleStart()
      return
    }
    if (isInProgress) {
      handleStartComplete()
    }
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
        
        {showReflection && reflection && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-3">
            <div className="bg-gradient-to-br from-blue-500 to-pink-500 p-4 sm:p-6 rounded-xl shadow-lg border border-blue-400 w-full max-w-md">
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
          </div>,
          document.body
        )}
      </>
    )
  }

  return (
    <div className="relative">
      {isInputting && !isSubTask && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-3">
          <div className="bg-gradient-to-br from-blue-500 to-pink-500 p-4 sm:p-6 rounded-xl shadow-lg border border-blue-400 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">タスクの振り返り</h3>
            
            <p className="text-sm text-white mb-3">
              実績時間は、完了済み子タスクの実績時間合計で自動計算されます。
            </p>

            <textarea
              placeholder="一言メモ: なぜ早く/遅く終わった？"
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
              rows={4}
              autoFocus
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
        </div>,
        document.body
      )}

      {isSubTask ? (
        <div className="flex flex-col items-end gap-2 w-full lg:w-auto">
          <div className="text-[11px] text-gray-300 tabular-nums">
            {elapsedMinutesView}:{String(elapsedSecondsView).padStart(2, '0')} ({elapsedMinutesForComplete}分)
          </div>
          <div className="flex flex-wrap justify-end items-center gap-1">
            {isRunning ? (
              <button
                onClick={handleTimerStop}
                disabled={isPending}
                className="px-2 py-1 text-[11px] font-bold rounded border bg-yellow-700 text-white border-yellow-600 hover:bg-yellow-600 transition-all"
              >
                ストップ
              </button>
            ) : (
              <button
                onClick={handleTimerStart}
                disabled={isPending}
                className="px-2 py-1 text-[11px] font-bold rounded border bg-blue-700 text-white border-blue-600 hover:bg-blue-600 transition-all"
              >
                スタート
              </button>
            )}
            <button
              onClick={handleTimerReset}
              disabled={isPending || isRunning}
              className="px-2 py-1 text-[11px] font-bold rounded border bg-gray-700 text-white border-gray-600 hover:bg-gray-600 transition-all disabled:opacity-50"
            >
              リセット
            </button>
            <button
              onClick={handleSubTaskComplete}
              disabled={isPending}
              className="px-2 py-1 text-[11px] font-bold rounded border bg-green-700 text-white border-green-600 hover:bg-green-600 transition-all"
            >
              完了
            </button>
          </div>
        </div>
      ) : (
      <button
        onClick={handleStatusClick}
        disabled={isPending}
        className={`px-3 py-1 text-xs font-bold rounded border transition-all ${
          isTodo
            ? 'bg-gray-700 text-white border-gray-600 hover:bg-blue-700 hover:border-blue-600'
            : 'bg-yellow-700 text-white border-yellow-600 hover:bg-gradient-to-r hover:from-blue-500 hover:to-pink-500 hover:border-pink-400'
        }`}
      >
        {isPending ? '...' : isTodo ? '未完了' : '進行中'}
      </button>
      )}
    </div>
  )
}
