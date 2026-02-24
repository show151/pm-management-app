// src/components/TaskDate.tsx
'use client'

type TaskDateProps = {
  startDate?: Date | null
  date: Date | null
  isDone: boolean
  isSubTask?: boolean
}

export default function TaskDate({ startDate, date, isDone, isSubTask = false }: TaskDateProps) {
  // 日付を "YYYY-MM-DD" に変換（チェック用）
  const dateValue = date ? new Date(date).toISOString().split('T')[0] : ''

  // 期限切れチェック
  const isOverdue = date && new Date(date) < new Date() && !isDone
  // 今日かどうかチェック
  const isToday = dateValue === new Date().toISOString().split('T')[0]

  if (!startDate && !date) return null

  // 親タスクは開始日＋期限日を表示
  if (!isSubTask) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {startDate && (
          <span className="flex items-center gap-1 text-xs text-gray-300">
            <span className="text-[10px] text-gray-400">開始:</span>
            <span className="px-2 py-1 text-xs rounded border bg-gray-800 text-gray-300 border-gray-600">
              {new Date(startDate).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })}
            </span>
          </span>
        )}
        {date && (
          <span className="flex items-center gap-1 text-xs text-gray-300">
            <span className="text-[10px] text-gray-400">期限:</span>
            <span className="px-2 py-1 text-xs rounded border bg-gray-800 text-gray-300 border-gray-600">
              {new Date(date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })}
            </span>
          </span>
        )}
      </div>
    )
  }

  // 子タスクは期限だけを表示（色付けあり）
  if (!date) return null

  return (
    <div className="flex items-center">
      {/* アイコン表示 - 子タスクのみ */}
      {isSubTask && (
        <span className="text-xs mr-1">
          {isOverdue ? '櫨' : isToday ? '笞｡' : '套'}
        </span>
      )}

      <span
        className={`
          px-2 py-1 text-xs rounded border
          ${isOverdue && isSubTask
            ? 'bg-red-900 text-red-200 border-red-600 font-bold'
            : isToday && isSubTask
              ? 'bg-yellow-900 text-yellow-200 border-yellow-600 font-bold'
              : 'bg-gray-800 text-gray-300 border-gray-600'
          }
        `}
      >
        {new Date(date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })}
      </span>
    </div>
  )
}
