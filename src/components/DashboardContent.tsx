'use client'

import Dashboard from '@/components/Dashboard'
import Link from 'next/link'
import { useState } from 'react'

type DashboardContentProps = {
  dashboardTasks: Array<{
    id: string
    title: string
    status: string
    estimatedMinutes: number | null
    actualMinutes: number | null
    projectId: string
    projectTitle: string
  }>
  parentTasks: Array<{
    id: string
    title: string
    status: string
    estimatedMinutes: number | null
    actualMinutes: number | null
    projectId: string
    projectTitle: string
  }>
  childTasks: Array<{
    id: string
    title: string
    status: string
    estimatedMinutes: number | null
    actualMinutes: number | null
    parentId: string | null
    projectId: string
    projectTitle: string
  }>
}

export default function DashboardContent({
  dashboardTasks,
  parentTasks,
  childTasks,
}: DashboardContentProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<'all' | string>('all')
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [openProjects, setOpenProjects] = useState<Record<string, boolean>>({})
  const [openParents, setOpenParents] = useState<Record<string, boolean>>({})

  const isTaskDoneWithTime = (task: {
    status: string
    estimatedMinutes: number | null
    actualMinutes: number | null
  }) => task.status === 'DONE' && task.estimatedMinutes !== null && task.actualMinutes !== null

  const projectOptions = Object.values(
    [...parentTasks, ...childTasks].reduce<Record<string, { id: string; title: string }>>((acc, task) => {
      if (!acc[task.projectId]) {
        acc[task.projectId] = { id: task.projectId, title: task.projectTitle }
      }
      return acc
    }, {})
  )

  const filteredDashboardTasks =
    selectedProjectId === 'all'
      ? dashboardTasks
      : dashboardTasks.filter((task) => task.projectId === selectedProjectId)

  const filteredParentTasks =
    selectedProjectId === 'all'
      ? parentTasks
      : parentTasks.filter((task) => task.projectId === selectedProjectId)

  const filteredChildTasks =
    selectedProjectId === 'all'
      ? childTasks
      : childTasks.filter((task) => task.projectId === selectedProjectId)

  // 完了親タスク（見積もり・実績あり）
  const completedParents = filteredParentTasks.filter((t) => isTaskDoneWithTime(t))

  // 完了子タスク（見積もり・実績あり）
  const completedChildren = filteredChildTasks.filter((t) => isTaskDoneWithTime(t))

  const completedParentCount = completedParents.length
  const completedChildCount = completedChildren.length

  const completedProjects = Object.values(
    filteredParentTasks.reduce<Record<string, { projectId: string; projectTitle: string; parents: typeof completedParents }>>(
      (acc, parent) => {
        const doneChildren = completedChildren.filter((child) => child.parentId === parent.id)
        const isParentDone = isTaskDoneWithTime(parent)

        if (!isParentDone && doneChildren.length === 0) {
          return acc
        }

        if (!acc[parent.projectId]) {
          acc[parent.projectId] = {
            projectId: parent.projectId,
            projectTitle: parent.projectTitle,
            parents: [],
          }
        }

        acc[parent.projectId].parents.push(parent)
        return acc
      },
      {}
    )
  )

  const toggleProject = (projectId: string) => {
    setOpenProjects((prev) => ({ ...prev, [projectId]: !prev[projectId] }))
  }

  const toggleParent = (parentId: string) => {
    setOpenParents((prev) => {
      const current = prev[parentId] ?? true
      return { ...prev, [parentId]: !current }
    })
  }

  const renderTaskItem = (
    task: {
      id: string
      title: string
      estimatedMinutes: number | null
      actualMinutes: number | null
    },
    isChild?: boolean
  ) => {
    const ratio = task.actualMinutes! / task.estimatedMinutes!
    const diff = task.actualMinutes! - task.estimatedMinutes!
    const diffStr = diff > 0 ? `+${diff}分` : `${diff}分`

    return (
      <div key={task.id} className={`bg-gray-700 bg-opacity-50 p-3 rounded border border-gray-600 ${isChild ? 'ml-3' : ''}`}>
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            <p className="font-medium text-white">{task.title}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-300">
              見積 {task.estimatedMinutes}分 → 実績 {task.actualMinutes}分
            </p>
            <p className={`text-xs font-medium ${diff > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {diffStr} (x{ratio.toFixed(2)})
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen px-3 py-4 sm:p-6 lg:p-8 bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        
        <div className="flex justify-end">
          <Link
            href="/"
            className="text-sm text-blue-400 hover:text-blue-300 underline self-start sm:self-auto"
          >
            ← ホームに戻る
          </Link>
        </div>

        <div className="bg-blue-900 bg-opacity-30 border border-blue-600 rounded-lg p-4">
          <h2 className="text-lg font-bold text-white mb-2">📊 PM スキル分析ダッシュボード</h2>
          <p className="text-sm text-gray-300">
            完了済みタスクの見積もりと実績から、あなたの PM スキル向上度を可視化します。
          </p>
          <div className="mt-3">
            <label htmlFor="project-filter" className="text-xs text-gray-300 mr-2">表示プロジェクト</label>
            <select
              id="project-filter"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
            >
              <option value="all">すべて</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ダッシュボード表示*/}
        <Dashboard tasks={filteredDashboardTasks} />

        {/* 完了タスク数の詳細表示 */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="font-bold text-white mb-3">📈 完了タスク統計</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-700 p-3 rounded-lg text-center border border-gray-600">
              <p className="text-xs text-gray-300 mb-1">完了親タスク数</p>
              <p className="text-2xl font-black text-blue-400">{completedParentCount}</p>
            </div>
            <div className="bg-gray-700 p-3 rounded-lg text-center border border-gray-600">
              <p className="text-xs text-gray-300 mb-1">完了子タスク数</p>
              <p className="text-2xl font-black text-pink-400">{completedChildCount}</p>
            </div>
          </div>
        </div>

        {/* 詳細リスト（トグル） */}
        {completedParentCount > 0 || completedChildCount > 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setIsDetailsOpen(!isDetailsOpen)}
              className="w-full px-4 py-3 text-left font-bold text-white hover:bg-gray-700 transition-colors flex items-center justify-between"
            >
              <span>✓ 完了済みタスク詳細</span>
              <span className={`transform transition-transform ${isDetailsOpen ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            
            {isDetailsOpen && (
              <div className="p-4 space-y-3 border-t border-gray-700 text-sm">
                {completedProjects.map((project) => (
                  <div key={project.projectId} className="bg-gray-900/40 border border-gray-700 rounded">
                    <button
                      onClick={() => toggleProject(project.projectId)}
                      className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-gray-700/40 transition-colors"
                    >
                      <span className="font-bold text-blue-300">プロジェクト: {project.projectTitle}</span>
                      <span className={`transform transition-transform ${openProjects[project.projectId] ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </button>

                    {openProjects[project.projectId] && (
                      <div className="p-3 border-t border-gray-700 space-y-3">
                        {project.parents.map((parent) => {
                          const parentDone = isTaskDoneWithTime(parent)
                          const childrenDone = completedChildren.filter((c) => c.parentId === parent.id)
                          const parentActualText = parentDone ? `${parent.actualMinutes ?? 0}分` : '未記録'
                          const parentDiff =
                            parentDone && parent.actualMinutes !== null && parent.estimatedMinutes !== null
                              ? parent.actualMinutes - parent.estimatedMinutes
                              : null
                          const parentRatio =
                            parentDone && parent.actualMinutes !== null && parent.estimatedMinutes !== null
                              ? (parent.actualMinutes / parent.estimatedMinutes).toFixed(2)
                              : null
                          const parentDiffText =
                            parentDiff === null ? '差分 未記録' : `${parentDiff > 0 ? `+${parentDiff}` : parentDiff}分 (x${parentRatio})`
                          const parentDiffClass =
                            parentDiff === null ? 'text-gray-400' : parentDiff > 0 ? 'text-red-400' : 'text-green-400'
                          const isParentOpen = openParents[parent.id] ?? true

                          return (
                            <div key={parent.id} className="bg-gray-800/70 border border-gray-700 rounded">
                              <button
                                onClick={() => toggleParent(parent.id)}
                                className="w-full p-3 text-left flex items-start justify-between gap-3 hover:bg-gray-700/40 transition-colors"
                              >
                                <span className="flex-1">
                                  <p className="font-semibold text-white">親: {parent.title}</p>
                                </span>
                                <span className="text-right">
                                  <p className="text-xs text-gray-300">
                                    見積 {parent.estimatedMinutes ?? '--'}分 → 実績 {parentActualText}
                                  </p>
                                  <p className={`text-xs font-medium ${parentDiffClass}`}>
                                    {parentDiffText}
                                  </p>
                                </span>
                                <span className={`transform transition-transform ${isParentOpen ? 'rotate-180' : ''}`}>
                                    ▼
                                </span>
                              </button>

                              {isParentOpen && (
                                <div className="p-3 border-t border-gray-700 space-y-2">
                                  {childrenDone.length > 0 && (
                                    <div className="space-y-2 border-l-2 border-gray-600 pl-3">
                                      <p className="text-xs font-bold text-pink-400">子タスク ({childrenDone.length})</p>
                                      {childrenDone.map((child) => renderTaskItem(child, true))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-800 border border-yellow-600 rounded-lg p-4 text-center">
            <p className="text-yellow-400 text-sm">
              📝 データがまだありません。タスクを完了させて、見積もり時間と実績時間を記録することでダッシュボードにデータが表示されます。
            </p>
          </div>
        )}

        {/* データ説明 */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
          <h3 className="font-bold text-white">📈 見方のガイド</h3>
          <ul className="text-sm text-gray-300 space-y-2">
            <li>
              <span className="font-medium text-white">完了親タスク数：</span>
              見積もり時間と実績時間が両方記録されている完了済み親タスク数
            </li>
            <li>
              <span className="font-medium text-white">完了子タスク数：</span>
              見積もり時間と実績時間が両方記録されている完了済み子タスク数
            </li>
            <li>
              <span className="font-medium text-white">総実績時間：</span>
              完了済み親タスクに費やした実際の時間（分）
            </li>
            <li>
              <span className="font-medium text-white">見積もり対実績比：</span>
              実績時間 ÷ 見積もり時間。1.0に近いほど見積もり精度が高い
            </li>
            <li className="text-xs text-gray-400 pt-1">
              例）x1.2 = 見積もりより 20% 時間が長引いた傾向 / x0.8 = 見積もりより 20% 早く完了した傾向
            </li>
          </ul>
        </div>
      </div>
    </main>
  )
}
