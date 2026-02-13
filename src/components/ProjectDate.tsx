// src/components/ProjectDate.tsx
'use client'

export default function ProjectDate({ date, isCompleted }: { date: Date | null, isCompleted: boolean }) {
  const dateValue = date ? new Date(date).toISOString().split('T')[0] : ''
  const isOverdue = date && new Date(date) < new Date() && !isCompleted
  const isToday = dateValue === new Date().toISOString().split('T')[0]

  // 日付が設定されていない場合は何も表示しない
  if (!date) return null

  return (
    <div className="flex items-center">
      <span className="text-xs mr-1">
        {isOverdue ? '🔥' : isToday ? '⚡' : '📅'}
      </span>

      <span
        className={`
          px-2 py-1 text-xs rounded border
          ${isOverdue 
            ? 'bg-red-900 text-red-200 border-red-600 font-bold' 
            : isToday
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
