'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

type GuestTask = {
  id: string
  title: string
  done: boolean
}

type GuestProject = {
  id: string
  title: string
  description: string
  tasks: GuestTask[]
}

const STORAGE_KEY = 'guest_pm_data_v1'

function createId() {
  return Math.random().toString(36).slice(2, 10)
}

export default function GuestWorkspace() {
  const [projects, setProjects] = useState<GuestProject[]>(() => {
    if (typeof window === 'undefined') return []
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    try {
      return JSON.parse(raw)
    } catch {
      return []
    }
  })
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({})

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  }, [projects])

  const totalTasks = useMemo(
    () => projects.reduce((acc, project) => acc + project.tasks.length, 0),
    [projects]
  )

  const doneTasks = useMemo(
    () => projects.reduce((acc, project) => acc + project.tasks.filter((task) => task.done).length, 0),
    [projects]
  )

  const addProject = () => {
    const title = newTitle.trim()
    if (!title) return

    setProjects((prev) => [
      {
        id: createId(),
        title,
        description: newDescription.trim(),
        tasks: [],
      },
      ...prev,
    ])
    setNewTitle('')
    setNewDescription('')
  }

  const deleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== projectId))
  }

  const addTask = (projectId: string) => {
    const taskTitle = (taskInputs[projectId] || '').trim()
    if (!taskTitle) return

    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId
          ? {
              ...project,
              tasks: [...project.tasks, { id: createId(), title: taskTitle, done: false }],
            }
          : project
      )
    )
    setTaskInputs((prev) => ({ ...prev, [projectId]: '' }))
  }

  const toggleTask = (projectId: string, taskId: string) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId
          ? {
              ...project,
              tasks: project.tasks.map((task) =>
                task.id === taskId ? { ...task, done: !task.done } : task
              ),
            }
          : project
      )
    )
  }

  const deleteTask = (projectId: string, taskId: string) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId
          ? {
              ...project,
              tasks: project.tasks.filter((task) => task.id !== taskId),
            }
          : project
      )
    )
  }

  return (
    <main className="min-h-screen p-8 bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="bg-gradient-to-r from-blue-500 to-pink-500 p-4 rounded-xl border border-blue-400">
          <h1 className="text-2xl font-bold">PM-Master (ゲストモード)</h1>
          <p className="text-sm text-gray-100 mt-1">
            ログインなしで利用できます。ブラウザを閉じるとデータは消えます。
          </p>
          <Link href="/login" className="inline-block mt-3 text-sm underline text-white">
            ログインしてデータを保存する
          </Link>
        </header>

        <section className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
          <h2 className="text-lg font-bold">新しいプロジェクト</h2>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="プロジェクト名"
            className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 text-sm"
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="説明（任意）"
            rows={2}
            className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 text-sm resize-none"
          />
          <button
            type="button"
            onClick={addProject}
            className="border-2 border-white text-white font-bold px-4 py-2 rounded hover:bg-white hover:text-blue-600 transition-all"
          >
            追加
          </button>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm">
            総タスク数: <span className="font-bold">{totalTasks}</span>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm">
            完了タスク数: <span className="font-bold">{doneTasks}</span>
          </div>
        </section>

        <section className="space-y-4">
          {projects.length === 0 && (
            <p className="text-gray-400 text-sm">プロジェクトを追加するとここに表示されます。</p>
          )}

          {projects.map((project) => {
            const doneCount = project.tasks.filter((task) => task.done).length
            return (
              <div key={project.id} className="bg-gradient-to-br from-blue-500 to-pink-500 p-5 rounded-xl border border-blue-400">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold">{project.title}</h3>
                    {project.description && <p className="text-sm text-gray-100 mt-1">{project.description}</p>}
                    <p className="text-xs text-gray-200 mt-2">
                      進捗: {doneCount}/{project.tasks.length}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteProject(project.id)}
                    className="text-sm bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
                  >
                    削除
                  </button>
                </div>

                <div className="mt-4 flex gap-2">
                  <input
                    value={taskInputs[project.id] || ''}
                    onChange={(e) => setTaskInputs((prev) => ({ ...prev, [project.id]: e.target.value }))}
                    placeholder="タスク名"
                    className="flex-1 border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => addTask(project.id)}
                    className="border border-white text-white px-3 py-2 rounded text-sm hover:bg-white hover:text-blue-600 transition-all"
                  >
                    追加
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {project.tasks.map((task) => (
                    <div key={task.id} className="bg-gray-900 border border-gray-700 rounded px-3 py-2 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleTask(project.id, task.id)}
                        className="text-sm text-left flex-1"
                      >
                        <span className={task.done ? 'line-through text-gray-400' : 'text-white'}>
                          {task.done ? '✓ ' : ''}{task.title}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTask(project.id, task.id)}
                        className="text-xs text-red-300 hover:text-red-200"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </section>
      </div>
    </main>
  )
}
