// src/components/TaskDate.tsx
'use client'

export default function TaskDate({ date, isDone, isSubTask = false }: { date: Date | null, isDone: boolean, isSubTask?: boolean }) {
  // 日付を "YYYY-MM-DD" 形式の文字列に変換（input type="date"用）
  const dateValue = date ? new Date(date).toISOString().split('T')[0] : ''

  // 期限切れチェック
  const isOverdue = date && new Date(date) < new Date() && !isDone
  // 今日かどうかチェック
  const isToday = dateValue === new Date().toISOString().split('T')[0]

  // 日付が設定されていない場合は何も表示しない
  if (!date) return null

  return (
    <div className="flex items-center">
      {/* アイコン装飾 - 子タスクのみ表示 */}
      {isSubTask && (
        <span className="text-xs mr-1">
          {isOverdue ? '🔥' : isToday ? '⚡' : '📅'}
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
