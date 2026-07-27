'use client'

type MatrixTask = {
  id: string
  title: string
  status: string
  importance: number
  urgency: number
}

type Props = {
  tasks: MatrixTask[]
}

const quadrants = [
  {
    label: '🔥 第1象限：重要 × 緊急',
    subtitle: '今すぐやる',
    filter: (t: MatrixTask) => t.importance >= 4 && t.urgency >= 4,
    borderColor: 'border-red-500/60',
    bgColor: 'bg-red-950/30',
    headerBg: 'bg-red-900/60',
    badgeColor: 'bg-red-600',
  },
  {
    label: '📋 第2象限：重要 × 非緊急',
    subtitle: '計画的に進める',
    filter: (t: MatrixTask) => t.importance >= 4 && t.urgency < 4,
    borderColor: 'border-blue-500/60',
    bgColor: 'bg-blue-950/30',
    headerBg: 'bg-blue-900/60',
    badgeColor: 'bg-blue-600',
  },
  {
    label: '⚡ 第3象限：非重要 × 緊急',
    subtitle: '委任・効率化',
    filter: (t: MatrixTask) => t.importance < 4 && t.urgency >= 4,
    borderColor: 'border-amber-500/60',
    bgColor: 'bg-amber-950/30',
    headerBg: 'bg-amber-900/60',
    badgeColor: 'bg-amber-600',
  },
  {
    label: '💤 第4象限：非重要 × 非緊急',
    subtitle: '見直し・削除候補',
    filter: (t: MatrixTask) => t.importance < 4 && t.urgency < 4,
    borderColor: 'border-gray-500/60',
    bgColor: 'bg-gray-900/30',
    headerBg: 'bg-gray-800/60',
    badgeColor: 'bg-gray-600',
  },
]

const statusStyles: Record<string, string> = {
  TODO: 'bg-gray-600 text-gray-100',
  IN_PROGRESS: 'bg-amber-600 text-amber-100',
  BLOCKED: 'bg-red-700 text-red-100',
  DONE: 'bg-emerald-700 text-emerald-100',
}

const statusLabels: Record<string, string> = {
  TODO: '未完了',
  IN_PROGRESS: '進行中',
  BLOCKED: 'ブロック中',
  DONE: '完了',
}

export default function PriorityMatrix({ tasks }: Props) {
  // DONEのタスクは除外（完了済みタスクはマトリクスに表示しない）
  const activeTasks = tasks.filter(t => t.status !== 'DONE')

  if (activeTasks.length === 0) {
    return (
      <div className="ui-panel rounded-lg p-6 text-center">
        <p className="text-gray-400 text-sm">
          未完了タスクがないため、マトリクスに表示するデータがありません。
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {quadrants.map((q, i) => {
        const filtered = activeTasks.filter(q.filter)
        return (
          <div key={i} className={`rounded-lg border ${q.borderColor} ${q.bgColor} overflow-hidden`}>
            <div className={`${q.headerBg} px-4 py-2.5 flex items-center justify-between`}>
              <div>
                <h3 className="text-sm font-bold text-white">{q.label}</h3>
                <p className="text-[10px] text-gray-300">{q.subtitle}</p>
              </div>
              <span className={`${q.badgeColor} text-white text-xs font-bold px-2 py-0.5 rounded-full`}>
                {filtered.length}
              </span>
            </div>
            <div className="p-3 space-y-2 min-h-[80px]">
              {filtered.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">タスクなし</p>
              ) : (
                filtered.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 bg-gray-800/60 border border-gray-700 rounded px-3 py-2"
                  >
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${statusStyles[task.status] || statusStyles.TODO}`}>
                      {statusLabels[task.status] || task.status}
                    </span>
                    <span className="text-sm text-white truncate flex-1">{task.title}</span>
                    <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">
                      重{task.importance}/緊{task.urgency}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
