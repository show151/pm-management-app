'use client'

import { useState, useTransition } from 'react'
import { reportBlocker, resolveBlocker } from '@/app/actions/blocker-actions'
import { createPortal } from 'react-dom'

type Blocker = {
  id: string
  reason: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  resolvedAt: Date | null
}

type Props = {
  taskId: string
  blockers: Blocker[]
}

export default function TaskBlockerUI({ taskId, blockers }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isReporting, setIsReporting] = useState(false)
  const [reason, setReason] = useState('')
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM')
  const [error, setError] = useState('')

  const activeBlockers = blockers.filter(b => b.resolvedAt === null)

  const handleReport = () => {
    if (!reason.trim()) {
      setError('理由を入力してください。')
      return
    }
    setError('')
    startTransition(async () => {
      const res = await reportBlocker(taskId, reason, severity)
      if (!res.ok) {
        setError(res.message || 'エラーが発生しました')
      } else {
        setIsReporting(false)
        setReason('')
        setSeverity('MEDIUM')
      }
    })
  }

  const handleResolve = (blockerId: string) => {
    if (!confirm('このブロッカーを解除してよろしいですか？')) return
    startTransition(async () => {
      await resolveBlocker(blockerId, taskId)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {activeBlockers.length > 0 ? (
        activeBlockers.map(blocker => (
          <div key={blocker.id} className="flex items-center gap-2 bg-red-900/50 text-red-200 px-2 py-1 rounded text-xs border border-red-700">
            <span className="font-bold">⚠️ ブロック中:</span>
            <span>{blocker.reason}</span>
            <span className="bg-red-800 px-1 rounded text-[10px]">{blocker.severity}</span>
            <button
              onClick={() => handleResolve(blocker.id)}
              disabled={isPending}
              className="ml-2 bg-red-800 hover:bg-red-700 text-white px-2 py-0.5 rounded transition-colors"
            >
              解除
            </button>
          </div>
        ))
      ) : (
        <button
          onClick={() => setIsReporting(true)}
          className="text-[10px] text-red-400 hover:text-red-300 border border-red-800 hover:border-red-600 px-2 py-0.5 rounded bg-gray-800 transition-colors"
        >
          ＋ ブロック報告
        </button>
      )}

      {isReporting && typeof document !== 'undefined' && createPortal(
        <div className="modal-backdrop" onClick={() => setIsReporting(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">ブロッカーを報告</h3>
            <div className="mb-4">
              <label className="text-xs text-gray-300 block mb-1">ブロックされている理由（必須）</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="form-control text-sm w-full h-24"
                placeholder="例: 仕様が未定のため進められない"
                autoFocus
              />
            </div>
            <div className="mb-4">
              <label className="text-xs text-gray-300 block mb-1">深刻度</label>
              <select
                value={severity}
                onChange={e => setSeverity(e.target.value as any)}
                className="form-control text-sm w-full"
              >
                <option value="LOW">LOW（軽微）</option>
                <option value="MEDIUM">MEDIUM（中程度）</option>
                <option value="HIGH">HIGH（重大）</option>
                <option value="CRITICAL">CRITICAL（致命的）</option>
              </select>
            </div>
            {error && <p className="text-red-400 text-xs mb-4">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsReporting(false)}
                className="btn btn-secondary text-sm px-4"
                disabled={isPending}
              >
                キャンセル
              </button>
              <button
                onClick={handleReport}
                className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded text-sm transition-colors"
                disabled={isPending}
              >
                報告する
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
