'use client'

import { useMemo, useState } from 'react'

type ChildTimelineItem = {
  id: string
  title: string
  startDate: string
  endDate: string | null
  status: string
}

type ParentTimelineItem = {
  id: string
  title: string
  startDate: string
  endDate: string | null
  status: string
  children: ChildTimelineItem[]
}

type Props = {
  items: ParentTimelineItem[]
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

function toDate(value: string | null) {
  return value ? new Date(value) : null
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatDate(value: string | null) {
  const date = toDate(value)
  if (!date) return '-'
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

function getStatusColor(status: string, isChild: boolean) {
  if (status === 'DONE' || status === 'COMPLETED') return 'bg-green-500/70'
  if (status === 'IN_PROGRESS') return 'bg-yellow-500/70'
  return isChild ? 'bg-pink-500/60' : 'bg-blue-500/60'
}

export default function TaskTimelineChart({ items }: Props) {
  const [expandedParentIds, setExpandedParentIds] = useState<Record<string, boolean>>({})

  const visibleItems = useMemo(() => {
    return items.flatMap((parent) => {
      const parentRow = {
        id: parent.id,
        title: `親: ${parent.title}`,
        startDate: parent.startDate,
        endDate: parent.endDate,
        status: parent.status,
        isChild: false,
        parentId: parent.id,
        hasChildren: parent.children.length > 0,
      }

      if (!expandedParentIds[parent.id]) {
        return [parentRow]
      }

      const childRows = parent.children.map((child) => ({
        id: child.id,
        title: `子: ${child.title}`,
        startDate: child.startDate,
        endDate: child.endDate,
        status: child.status,
        isChild: true,
        parentId: parent.id,
        hasChildren: false,
      }))

      return [parentRow, ...childRows]
    })
  }, [items, expandedParentIds])

  if (items.length === 0) {
    return (
      <section className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <h2 className="text-lg font-bold text-white mb-2">タスクタイムライン</h2>
        <p className="text-sm text-gray-400">表示できるタスクがありません。</p>
      </section>
    )
  }

  const normalized = visibleItems.map((item) => {
    const start = startOfDay(new Date(item.startDate))
    const end = startOfDay(toDate(item.endDate) ?? start)
    const startMs = start.getTime()
    const endMs = Math.max(startMs, end.getTime())
    return { ...item, startMs, endMs }
  })

  const minMs = Math.min(...normalized.map((item) => item.startMs))
  const maxMs = Math.max(...normalized.map((item) => item.endMs))
  const safeMaxMs = maxMs === minMs ? maxMs + ONE_DAY_MS : maxMs
  const days: Date[] = []
  for (let current = minMs; current <= safeMaxMs; current += ONE_DAY_MS) {
    days.push(new Date(current))
  }

  const toggleParent = (parentId: string) => {
    setExpandedParentIds((prev) => ({ ...prev, [parentId]: !prev[parentId] }))
  }

  return (
    <section className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <h2 className="text-lg font-bold text-white mb-4">タスクタイムライン</h2>

      <div className="overflow-x-auto border border-gray-700 rounded-lg">
        <table className="min-w-max border-collapse text-xs">
          <thead>
            <tr>
              <th className="bg-gray-900 border border-gray-700 px-3 py-2 text-left text-gray-200 min-w-44">
                タスク
              </th>
              {days.map((day) => (
                <th key={day.toISOString()} className="bg-gray-900 border border-gray-700 px-1 py-2 text-gray-400 min-w-8">
                  {formatHeader(day)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {normalized.map((item) => {
              const rowColor = getStatusColor(item.status, item.isChild)
              const isExpanded = !!expandedParentIds[item.parentId]

              return (
                <tr key={item.id}>
                  <td className="bg-gray-900 border border-gray-700 px-3 py-2 text-white">
                    <button
                      type="button"
                      onClick={() => !item.isChild && toggleParent(item.parentId)}
                      className={`text-left w-full ${item.isChild ? 'pl-5 text-gray-300 cursor-default' : 'hover:underline'}`}
                    >
                      <div className="truncate">
                        {!item.isChild && item.hasChildren ? (isExpanded ? '▼ ' : '▶ ') : ''}
                        {item.title}
                      </div>
                      <div className="text-[10px] text-gray-400 whitespace-nowrap">
                        {formatDate(item.startDate)} - {formatDate(item.endDate ?? item.startDate)}
                      </div>
                    </button>
                  </td>
                  {days.map((day) => {
                    const dayMs = day.getTime()
                    const inRange = dayMs >= item.startMs && dayMs <= item.endMs
                    return (
                      <td
                        key={`${item.id}-${day.toISOString()}`}
                        className={`border border-gray-700 h-6 min-w-8 ${inRange ? rowColor : 'bg-gray-800'}`}
                        title={inRange ? `${item.title}: ${formatDate(day.toISOString())}` : undefined}
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
