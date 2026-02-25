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
  startDate?: Date | null
  dueDate?: Date | null
  actualStartAt?: Date | null
  actualEndAt?: Date | null
  isSubTask?: boolean
}

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDayMs(value: Date | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function formatDateTime(value: Date | null | undefined) {
  if (!value) return ''
  return new Date(value).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildDeltaText(
  label: '開始' | '完了',
  actualAt: Date | null | undefined,
  plannedAt: Date | null | undefined
) {
  if (!actualAt) return null
  const actualLabel = `${label}記録: ${formatDateTime(actualAt)}`
  const actualMs = startOfDayMs(actualAt)
  const plannedMs = startOfDayMs(plannedAt)

  if (actualMs === null || plannedMs === null) {
    return actualLabel
  }

  const diffDays = Math.round((actualMs - plannedMs) / DAY_MS)
  if (diffDays === 0) {
    return `${actualLabel}（予定通り）`
  }
  if (diffDays > 0) {
    return `${actualLabel}（${diffDays}日遅れ）`
  }
  return `${actualLabel}（${Math.abs(diffDays)}日前倒し）`
}

export default function TaskStatusButton({
  taskId,
  status,
  actualMinutes,
  estimatedMinutes,
  reflection,
  startDate,
  dueDate,
  actualStartAt,
  actualEndAt,
  isSubTask = false,
}: Props) {
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
  const startDeltaText = !isSubTask ? buildDeltaText('開始', actualStartAt, startDate) : null
  const endDeltaText = !isSubTask ? buildDeltaText('完了', actualEndAt, dueDate) : null

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
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={isPending}
              className="btn text-xs border-emerald-300/80 bg-emerald-500/25 text-emerald-100 hover:bg-emerald-500/35"
            >
              {isPending ? '...' : `✓ 完了 (実績: ${actualMinutes}分)`}
            </button>
            {reflection && (
              <button
                onClick={() => setShowReflection(true)}
                className="btn btn-primary text-xs"
              >
                📝 振り返り
              </button>
            )}
          </div>
          {startDeltaText && <p className="text-[11px] text-gray-300">{startDeltaText}</p>}
          {endDeltaText && <p className="text-[11px] text-gray-300">{endDeltaText}</p>}
        </div>
        
        {showReflection && reflection && typeof document !== 'undefined' && createPortal(
          <div className="modal-backdrop">
            <div className="modal-card max-h-[calc(100vh-2rem)] overflow-y-auto">
              <h3 className="text-xl font-bold text-white mb-4">振り返り</h3>
              <div className="form-control mb-4">
                <p className="text-white whitespace-pre-wrap">{reflection}</p>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowReflection(false)}
                  className="btn btn-secondary"
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
        <div className="modal-backdrop">
          <div className="modal-card max-h-[calc(100vh-2rem)] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">タスクの振り返り</h3>
            
            <p className="text-sm text-white mb-3">
              実績時間は、完了済み子タスクの実績時間合計で自動計算されます。
            </p>

            <textarea
              placeholder="一言メモ: なぜ早く/遅く終わった？"
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              className="form-control mb-4 resize-none"
              rows={4}
              autoFocus
            />
            
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setIsInputting(false)}
                className="btn btn-secondary"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="btn btn-primary text-sm"
              >
                {isPending ? '...' : '確定して完了'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isSubTask ? (
        <div className="flex flex-col items-start sm:items-end gap-2 w-full">
          <div className="text-[11px] text-gray-300 tabular-nums">
            {elapsedMinutesView}:{String(elapsedSecondsView).padStart(2, '0')} ({elapsedMinutesForComplete}分)
          </div>
          <div className="flex flex-wrap justify-start sm:justify-end items-center gap-1 w-full sm:w-auto">
            {isRunning ? (
              <button
                onClick={handleTimerStop}
                disabled={isPending}
                className="btn px-2 py-1 text-[11px] border-rose-300/80 bg-rose-500/30 text-rose-100 hover:bg-rose-500/45"
              >
                ストップ
              </button>
            ) : (
              <button
                onClick={handleTimerStart}
                disabled={isPending}
                className="btn px-2 py-1 text-[11px] border-emerald-300/80 bg-emerald-500/30 text-emerald-100 hover:bg-emerald-500/45"
              >
                スタート
              </button>
            )}
            <button
              onClick={handleTimerReset}
              disabled={isPending || isRunning}
              className="btn btn-secondary px-2 py-1 text-[11px]"
            >
              リセット
            </button>
            <button
              onClick={handleSubTaskComplete}
              disabled={isPending}
              className="btn px-2 py-1 text-[11px] border-sky-300/80 bg-sky-500/30 text-sky-100 hover:bg-sky-500/45"
            >
              完了
            </button>
          </div>
        </div>
      ) : (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={handleStatusClick}
          disabled={isPending}
          className={`btn text-xs ${
            isTodo
              ? 'border-gray-400/70 bg-gray-500/20 text-gray-100 hover:bg-gray-500/30'
              : 'border-amber-300/80 bg-amber-500/25 text-amber-100 hover:bg-amber-500/35'
          }`}
        >
          {isPending ? '...' : isTodo ? '未完了' : '進行中'}
        </button>
        {isInProgress && startDeltaText && <p className="text-[11px] text-gray-300">{startDeltaText}</p>}
      </div>
      )}
    </div>
  )
}
