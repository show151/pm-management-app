type TimelineItem = {
  id: string
  title: string
  startDate: Date
  endDate: Date | null
  status: string
}

type Props = {
  title: string
  emptyMessage: string
  items: TimelineItem[]
}

type Column = 
  | { type: 'day'; date: Date; ms: number }
  | { type: 'gap'; skippedDays: number; gapStartMs: number; gapEndMs: number }

const ONE_DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatDate(date: Date) {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function formatHeader(date: Date) {
  return date.toLocaleDateString('ja-JP', {
    month: '2-digit',
    day: '2-digit',
  })
}

const PROJECT_COLORS = [
  { cell: 'bg-sky-500/60', dot: 'bg-sky-400' },
  { cell: 'bg-emerald-500/60', dot: 'bg-emerald-400' },
  { cell: 'bg-amber-500/60', dot: 'bg-amber-400' },
  { cell: 'bg-rose-500/60', dot: 'bg-rose-400' },
  { cell: 'bg-violet-500/60', dot: 'bg-violet-400' },
  { cell: 'bg-cyan-500/60', dot: 'bg-cyan-400' },
]

export default function TimelineChart({ title, emptyMessage, items }: Props) {
  if (items.length === 0) {
    return (
      <section className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
        <p className="text-sm text-gray-400">{emptyMessage}</p>
      </section>
    )
  }

  const normalized = items.map((item, index) => {
    const start = startOfDay(item.startDate)
    const rawEnd = startOfDay(item.endDate ?? item.startDate)
    const startMs = start.getTime()
    const rawEndMs = rawEnd.getTime()
    const endMs = Math.max(startMs, rawEndMs)
    return { ...item, startMs, endMs, start, end: new Date(endMs), colorIndex: index % PROJECT_COLORS.length }
  })

  const minMs = Math.min(...normalized.map((item) => item.startMs))
  const maxMs = Math.max(...normalized.map((item) => item.endMs))
  const safeMaxMs = maxMs === minMs ? maxMs + ONE_DAY_MS : maxMs

  const allDays: Date[] = []
  for (let current = minMs; current <= safeMaxMs; current += ONE_DAY_MS) {
    allDays.push(new Date(current))
  }

  // 重要な日（アイテムの開始・終了日±1日）を収集
  const importantMs = new Set<number>()
  normalized.forEach((item) => {
    for (let offset = -1; offset <= 1; offset++) {
      importantMs.add(item.startMs + offset * ONE_DAY_MS)
      importantMs.add(item.endMs + offset * ONE_DAY_MS)
    }
  })

  // 省略付きカラムリストを構築（3日以上の空白ギャップを省略）
  const columns: Column[] = []
  let i = 0
  while (i < allDays.length) {
    const dayMs = allDays[i].getTime()
    if (importantMs.has(dayMs)) {
      columns.push({ type: 'day', date: allDays[i], ms: dayMs })
      i++
    } else {
      let gapStart = i
      while (i < allDays.length && !importantMs.has(allDays[i].getTime())) {
        i++
      }
      const skipped = i - gapStart
      if (skipped >= 3) {
        columns.push({ type: 'gap', skippedDays: skipped, gapStartMs: allDays[gapStart].getTime(), gapEndMs: allDays[i - 1].getTime() })
      } else {
        for (let j = gapStart; j < i; j++) {
          columns.push({ type: 'day', date: allDays[j], ms: allDays[j].getTime() })
        }
      }
    }
  }

  return (
    <section className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <h2 className="text-lg font-bold text-white mb-4">{title}</h2>

      <div className="overflow-x-auto border border-gray-700 rounded-lg">
        <table className="min-w-max border-collapse text-xs">
          <thead>
            <tr>
              <th className="bg-gray-900 border border-gray-700 px-3 py-2 text-left text-gray-200 min-w-44">
                項目
              </th>
              {columns.map((col, idx) => {
                if (col.type === 'gap') {
                  return (
                    <th key={`gap-${idx}`} className="bg-gray-800 border border-gray-700 px-1 py-2 text-gray-500 text-[10px] w-8">
                      ...
                    </th>
                  )
                }
                return (
                  <th key={col.date.toISOString()} className="bg-gray-900 border border-gray-700 px-1 py-2 text-gray-400 min-w-8">
                    {formatHeader(col.date)}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {normalized.map((item) => {
              const color = PROJECT_COLORS[item.colorIndex]
              const isCompleted = item.status === 'DONE' || item.status === 'COMPLETED'
              const rowColor = isCompleted ? 'bg-gray-500/50' : color.cell

              return (
                <tr key={item.id}>
                  <td className="bg-gray-900 border border-gray-700 px-3 py-2 text-white">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${isCompleted ? 'bg-gray-400' : color.dot}`} />
                      <div className="min-w-0">
                        <div className="truncate">{item.title}</div>
                        <div className="text-[10px] text-gray-400 whitespace-nowrap">
                          {formatDate(item.startDate)} - {formatDate(item.endDate ?? item.startDate)}
                        </div>
                      </div>
                    </div>
                  </td>
                  {columns.map((col, idx) => {
                    if (col.type === 'gap') {
                      // ギャップ期間中にタスクがまたがっているか判定
                      const overlaps = item.startMs <= col.gapEndMs && item.endMs >= col.gapStartMs
                      return (
                        <td
                          key={`gap-${item.id}-${idx}`}
                          className={`border border-gray-700 h-6 w-8 text-center text-gray-600/30 overflow-hidden ${overlaps ? rowColor : 'bg-gray-800'}`}
                          title={overlaps ? `${item.title}: 省略期間中` : undefined}
                        >
                          ・
                        </td>
                      )
                    }

                    const dayMs = col.ms
                    const inRange = dayMs >= item.startMs && dayMs <= item.endMs
                    return (
                      <td
                        key={`${item.id}-${col.date.toISOString()}`}
                        className={`border border-gray-700 h-6 min-w-8 ${inRange ? rowColor : 'bg-gray-800'}`}
                        title={inRange ? `${item.title}: ${formatDate(col.date)}` : undefined}
                      />
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
