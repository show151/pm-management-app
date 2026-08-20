'use client'

import { useMemo, useState } from 'react'

type Dependency = { id: string; predecessorId: string; dependentId: string }

export type GanttTask = {
  id: string
  title: string
  startDate: string
  endDate: string | null
  status: string
  isChild: boolean
  parentId: string | null
  predecessors: Dependency[]
  dependents: Dependency[]
}

type Props = {
  tasks: GanttTask[]
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const ROW_HEIGHT = 40
const COL_WIDTH = 40
const HEADER_HEIGHT = 40

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getStatusColor(status: string, isChild: boolean, isCritical: boolean) {
  if (isCritical && status !== 'DONE') return '#ef4444' // red for critical path
  if (status === 'DONE' || status === 'COMPLETED') return '#22c55e'
  if (status === 'IN_PROGRESS') return '#eab308'
  return isChild ? '#ec4899' : '#3b82f6'
}

export default function ProjectGanttChart({ tasks }: Props) {
  const [expandedParentIds, setExpandedParentIds] = useState<Record<string, boolean>>({})

  const toggleParent = (parentId: string) => {
    setExpandedParentIds((prev) => ({ ...prev, [parentId]: !prev[parentId] }))
  }

  // クリティカルパスの簡易計算（最も長い経路を赤くする）
  // 深さ優先探索で最も深い経路を見つける
  const criticalPathSet = useMemo(() => {
    const cp = new Set<string>()
    const adj = new Map<string, string[]>()
    
    // Create adjacency list
    tasks.forEach(t => {
      adj.set(t.id, t.dependents.map(d => d.dependentId))
    })

    const memo = new Map<string, { len: number, path: string[] }>()

    function dfs(nodeId: string): { len: number, path: string[] } {
      if (memo.has(nodeId)) return memo.get(nodeId)!
      
      const neighbors = adj.get(nodeId) || []
      let maxLen = 0
      let maxPath: string[] = []

      for (const n of neighbors) {
        const res = dfs(n)
        if (res.len > maxLen) {
          maxLen = res.len
          maxPath = res.path
        }
      }

      const result = { len: maxLen + 1, path: [nodeId, ...maxPath] }
      memo.set(nodeId, result)
      return result
    }

    let globalMax = 0
    let globalPath: string[] = []

    tasks.forEach(t => {
      // 始点（先行タスクがないもの）から探索
      if (t.predecessors.length === 0) {
        const res = dfs(t.id)
        if (res.len > globalMax) {
          globalMax = res.len
          globalPath = res.path
        }
      }
    })

    globalPath.forEach(id => cp.add(id))
    return cp
  }, [tasks])

  const visibleTasks = useMemo(() => {
    const todayMs = startOfDay(new Date()).getTime()

    const isVisible = (status: string, startDateStr: string, endDateStr: string | null) => {
      if (status !== 'DONE' && status !== 'COMPLETED') return true
      const start = startOfDay(new Date(startDateStr))
      const end = startOfDay(endDateStr ? new Date(endDateStr) : start)
      return end.getTime() >= todayMs
    }

    const filteredTasks = tasks.filter(t => isVisible(t.status, t.startDate, t.endDate))

    const result: GanttTask[] = []
    filteredTasks.forEach(t => {
      if (!t.isChild) {
        result.push(t)
        if (expandedParentIds[t.id]) {
          const children = filteredTasks.filter(c => c.parentId === t.id)
          result.push(...children)
        }
      }
    })
    return result
  }, [tasks, expandedParentIds])

  if (visibleTasks.length === 0) {
    return (
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 text-gray-400">
        表示できるタスクがありません。
      </div>
    )
  }

  const normalized = visibleTasks.map(t => {
    const s = startOfDay(new Date(t.startDate)).getTime()
    const eDate = t.endDate ? new Date(t.endDate) : new Date(t.startDate)
    const e = startOfDay(eDate).getTime()
    let endMs = Math.max(s, e)
    
    // 未完了で期限が過去のものは、今日までバーを伸ばす（まだ終わっていないため）
    const todayMs = startOfDay(new Date()).getTime()
    if (t.status !== 'DONE' && t.status !== 'COMPLETED' && endMs < todayMs) {
      endMs = todayMs
    }
    
    return { ...t, startMs: s, endMs }
  })

  const todayMs = startOfDay(new Date()).getTime()
  const minMs = todayMs
  const maxMs = Math.max(...normalized.map(t => t.endMs), todayMs)
  const safeMaxMs = maxMs === minMs ? maxMs + ONE_DAY_MS * 7 : maxMs + ONE_DAY_MS * 3

  const days: Date[] = []
  for (let current = minMs; current <= safeMaxMs; current += ONE_DAY_MS) {
    days.push(new Date(current))
  }

  const chartWidth = days.length * COL_WIDTH
  const chartHeight = normalized.length * ROW_HEIGHT

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 overflow-hidden flex flex-col">
      <div className="mb-2 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#ef4444] inline-block"></span> クリティカルパス</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#22c55e] inline-block"></span> 完了</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#eab308] inline-block"></span> 進行中</div>
      </div>
      <div className="flex flex-1 overflow-x-auto border border-gray-700 bg-gray-900 rounded custom-scrollbar">
        {/* 左側：タスクリスト */}
        <div className="w-48 shrink-0 bg-gray-900 border-r border-gray-700 z-10 sticky left-0">
          <div className="h-10 border-b border-gray-700 flex items-center px-2 text-xs font-bold text-gray-300">
            タスク名
          </div>
          {normalized.map((t, idx) => (
            <div 
              key={t.id} 
              className="h-10 border-b border-gray-700 flex items-center px-2 text-xs text-white truncate"
              style={{ paddingLeft: t.isChild ? '1.5rem' : '0.5rem' }}
            >
              {!t.isChild && tasks.some(c => c.parentId === t.id) && (
                <button onClick={() => toggleParent(t.id)} className="mr-1 text-gray-400 hover:text-white">
                  {expandedParentIds[t.id] ? '▼' : '▶'}
                </button>
              )}
              <span className="truncate" title={t.title}>{t.title}</span>
            </div>
          ))}
        </div>

        {/* 右側：ガントチャート描画エリア */}
        <div className="relative" style={{ width: chartWidth, height: chartHeight + HEADER_HEIGHT }}>
          {/* ヘッダー背景とグリッド線 */}
          <div className="absolute top-0 left-0 w-full h-10 border-b border-gray-700 flex">
            {days.map((d, i) => (
              <div key={i} className="h-full border-r border-gray-800 flex items-center justify-center text-[10px] text-gray-400 shrink-0" style={{ width: COL_WIDTH }}>
                {d.getDate()}
              </div>
            ))}
          </div>

          <svg className="absolute top-10 left-0" width={chartWidth} height={chartHeight}>
            {/* 縦グリッド線 */}
            {days.map((d, i) => (
              <line key={`v-${i}`} x1={i * COL_WIDTH} y1={0} x2={i * COL_WIDTH} y2={chartHeight} stroke="#374151" strokeWidth={1} />
            ))}
            {/* 横グリッド線 */}
            {normalized.map((t, i) => (
              <line key={`h-${i}`} x1={0} y1={(i + 1) * ROW_HEIGHT} x2={chartWidth} y2={(i + 1) * ROW_HEIGHT} stroke="#374151" strokeWidth={1} />
            ))}

            {/* 依存関係の矢印を描画 */}
            {normalized.map((t, idx) => {
              return t.dependents.map(dep => {
                const targetIdx = normalized.findIndex(n => n.id === dep.dependentId)
                if (targetIdx === -1) return null // Target not visible or filtered
                
                const isCritical = criticalPathSet.has(t.id) && criticalPathSet.has(dep.dependentId)
                
                const startX = ((t.endMs - minMs) / ONE_DAY_MS + 1) * COL_WIDTH
                const startY = idx * ROW_HEIGHT + ROW_HEIGHT / 2
                
                const endTask = normalized[targetIdx]
                const endX = ((endTask.startMs - minMs) / ONE_DAY_MS) * COL_WIDTH
                const endY = targetIdx * ROW_HEIGHT + ROW_HEIGHT / 2

                const color = isCritical ? '#ef4444' : '#6b7280'
                const strokeWidth = isCritical ? 2 : 1

                // 簡単な折れ線
                const midX = startX + 10
                
                return (
                  <g key={`${t.id}-${dep.dependentId}`}>
                    <path
                      d={`M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`}
                      fill="none"
                      stroke={color}
                      strokeWidth={strokeWidth}
                      markerEnd={`url(#arrow-${isCritical ? 'critical' : 'normal'})`}
                    />
                  </g>
                )
              })
            })}

            {/* タスクバーの描画 */}
            {normalized.map((t, idx) => {
              const x = ((t.startMs - minMs) / ONE_DAY_MS) * COL_WIDTH
              const w = Math.max(1, ((t.endMs - t.startMs) / ONE_DAY_MS) + 1) * COL_WIDTH - 4
              const y = idx * ROW_HEIGHT + 8
              const h = ROW_HEIGHT - 16
              
              const isCritical = criticalPathSet.has(t.id)
              const color = getStatusColor(t.status, t.isChild, isCritical)

              return (
                <rect
                  key={`bar-${t.id}`}
                  x={x + 2}
                  y={y}
                  width={w}
                  height={h}
                  fill={color}
                  rx={4}
                  className="transition-all hover:opacity-80"
                />
              )
            })}
            
            {/* 矢印マーカーの定義 */}
            <defs>
              <marker id="arrow-normal" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#6b7280" />
              </marker>
              <marker id="arrow-critical" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#ef4444" />
              </marker>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  )
}
