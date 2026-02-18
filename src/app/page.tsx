// src/app/page.tsx

import { prisma } from '@/lib/prisma'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import NewProjectButton from '@/components/NewProjectButton'
import ProjectDate from '@/components/ProjectDate'
import ProjectStatusButton from '@/components/ProjectStatusButton'
import ProjectActions from '@/components/ProjectActions'
import Link from 'next/link'
import Dashboard from '@/components/Dashboard'
import TimelineChart from '@/components/TimelineChart'

function formatTimeLeft(dueDate: Date) {
  const deadline = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate() + 1,
    0,
    0,
    0,
    0
  )
  const timeLeft = deadline.getTime() - Date.now()
  const isOverdue = timeLeft < 0
  const absMs = Math.abs(timeLeft)

  const days = Math.floor(absMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor(absMs / (1000 * 60 * 60)) % 24

  if (days >= 1) {
    return isOverdue ? `${days}日超過` : `残り${days}日`
  }

  if (hours >= 1) {
    return isOverdue ? `${hours}時間超過` : `あと${hours}時間`
  }

  return isOverdue ? '期限切れ' : '1時間未満'
}

export default async function Home() {
  // 1. Supabaseのユーザー情報を取得
  const supabase = await createClient()
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] | null = null

  try {
    const { data, error } = await supabase.auth.getUser()
    user = error ? null : data.user
  } catch {
    user = null
  }

  // 2. 未ログインはログイン画面へ
  if (!user) {
    redirect('/login')
  }

  // 3. ユーザーがPrisma側のDBに存在するか確認し、いなければ作成（同期）
  // ※AuthのIDと、PrismaのUserテーブルのIDを一致させます
  const metadataName = typeof user.user_metadata?.name === 'string' ? user.user_metadata.name.trim() : ''
  const fallbackName = user.email?.split('@')[0] || 'New User'
  let dbUser = await prisma.user.findUnique({
    where: { id: user.id }
  })

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        id: user.id, // Supabase AuthのUUIDを使う
        email: user.email!,
        name: metadataName || fallbackName,
      }
    })
  } else if (!dbUser.name && metadataName) {
    dbUser = await prisma.user.update({
      where: { id: user.id },
      data: { name: metadataName },
    })
  }

  const urgentDeadline = new Date()
  urgentDeadline.setDate(urgentDeadline.getDate() + 3)

  // 4. ログインユーザーのプロジェクトだけを取得（期限順）
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { userId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
    include: {
      tasks: {
        where: {
          status: { not: 'DONE' },
          parentId: { not: null },
        },
        orderBy: [
          { dueDate: 'asc' },
          { createdAt: 'asc' }
        ],
        take: 1
      }
    },
    orderBy: [
      { dueDate: 'asc' },
      { createdAt: 'desc' }
    ]
  })

  // 全タスク数を取得
  const projectsWithTaskCount = await Promise.all(
    projects.map(async (project) => {
      const parentRemainingCount = await prisma.task.count({
        where: { projectId: project.id, parentId: null, status: { not: 'DONE' } }
      })
      const subRemainingCount = await prisma.task.count({
        where: { projectId: project.id, parentId: { not: null }, status: { not: 'DONE' } }
      })
      const parentCompletedCount = await prisma.task.count({
        where: { projectId: project.id, parentId: null, status: 'DONE' }
      })
      const subCompletedCount = await prisma.task.count({
        where: { projectId: project.id, parentId: { not: null }, status: 'DONE' }
      })
      return { ...project, parentRemainingCount, subRemainingCount, parentCompletedCount, subCompletedCount }
    })
  )

  // ダッシュボード用のタスクデータ
  const allTasksForDashboard = projectsWithTaskCount.flatMap(p => 
    p.tasks.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      estimatedMinutes: t.estimatedMinutes,
      actualMinutes: t.actualMinutes,
    }))
  )

  const projectTimelineItems = projectsWithTaskCount.map((project) => ({
    id: project.id,
    title: project.title,
    startDate: project.startDate ?? project.createdAt,
    endDate: project.dueDate,
    status: project.status,
  }))

  const ownProjects = projectsWithTaskCount.filter((project) => project.userId === user.id)
  const sharedProjects = projectsWithTaskCount.filter((project) => project.userId !== user.id)

  // 期限が近いタスクを取得（3日以内、子タスクのみ）
  const urgentTasks = await prisma.task.findMany({
    where: {
      project: {
        OR: [
          { userId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
      status: { not: 'DONE' },
      parentId: { not: null }, // 子タスクのみ
      dueDate: {
        lte: urgentDeadline
      }
    },
    include: {
      project: true
    },
    orderBy: { dueDate: 'asc' },
    take: 5
  })

  return (
    <main className="min-h-screen px-3 py-4 sm:p-6 lg:p-8 bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        
        <Header email={user?.email || 'Guest'} name={dbUser?.name || fallbackName} />

        {/* ↓ ここにダッシュボードを配置 */}
        <Dashboard tasks={allTasksForDashboard} />
        <TimelineChart
          title="プロジェクトタイムライン"
          emptyMessage="表示できるプロジェクトがありません。"
          items={projectTimelineItems}
        />

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          {urgentTasks.length > 0 && (
            <div className="w-full flex-grow bg-red-900 bg-opacity-50 border border-red-600 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">⚠️</span>
                <h3 className="text-sm font-bold text-white">期限が近いタスク ({urgentTasks.length})</h3>
              </div>
              <div className="space-y-1">
                {urgentTasks.map((task) => {
                  if (!task.dueDate) return null
                  const timeDisplay = formatTimeLeft(task.dueDate)
                  
                  return (
                    <Link key={task.id} href={`/project/${task.projectId}`}>
                      <div className="text-xs text-white hover:text-gray-200 flex flex-wrap items-center gap-2">
                        <span className="font-medium">{task.title}</span>
                        <span className="text-red-300">({timeDisplay})</span>
                        <span className="text-gray-400">- {task.project.title}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
            <Link
              href="/dashboard"
              className="flex-1 sm:flex-none border-2 border-white text-white font-bold px-4 py-2 rounded hover:bg-white hover:text-blue-600 transition-all text-sm text-center"
            >
              📊 ダッシュボード
            </Link>
            <NewProjectButton />
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">👤 個人プロジェクト ({ownProjects.length})</h2>
          {ownProjects.length === 0 ? (
            <p className="text-sm text-gray-400">個人プロジェクトはありません。</p>
          ) : (
            ownProjects.map((project) => {
              const nextTask = project.tasks[0]
              const isOwner = project.userId === user.id

              return (
                <div key={project.id} className={`relative bg-gradient-to-br from-blue-500 to-pink-500 p-4 sm:p-6 rounded-xl shadow-lg border border-blue-400 ${project.status === 'COMPLETED' ? 'opacity-60' : ''}`}>
                  <Link
                    href={`/project/${project.id}`}
                    aria-label={`${project.title} を開く`}
                    className="absolute inset-0 rounded-xl z-10"
                  />
                  <div className="pointer-events-none relative z-20 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                    <div className="flex-grow">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <h2 className={`text-lg sm:text-xl font-semibold text-white ${project.status === 'COMPLETED' ? 'line-through' : ''}`}>{project.title}</h2>
                        <div className="pointer-events-auto">
                          <ProjectStatusButton projectId={project.id} status={project.status} />
                        </div>
                      </div>
                      <p className="text-gray-200 text-sm mb-2">{project.description}</p>
                      <ProjectDate startDate={project.startDate} date={project.dueDate} isCompleted={project.status === 'COMPLETED'} />
                    </div>
                    <div className="pointer-events-auto">
                      <ProjectActions projectId={project.id} title={project.title} description={project.description || ''} startDate={project.startDate} dueDate={project.dueDate} canDelete={isOwner} />
                    </div>
                  </div>

                  {nextTask && (
                    <div className="pointer-events-none relative z-20 mt-4 p-3 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-300 mb-1">次のタスク:</p>
                      <p className="text-sm text-white font-medium">{nextTask.title}</p>
                      {nextTask.dueDate && (
                        <p className="text-xs text-gray-400 mt-1">
                          📅 {new Date(nextTask.dueDate).toLocaleDateString('ja-JP')} ({formatTimeLeft(nextTask.dueDate)})
                        </p>
                      )}
                    </div>
                  )}

                  <div className="pointer-events-none relative z-20 mt-4 flex flex-wrap gap-3 text-sm">
                    <span className="text-white">📋 残り親タスク {project.parentRemainingCount}</span>
                    <span className="text-white">📝 残り子タスク {project.subRemainingCount}</span>
                    <span className="text-white">✓ {project.parentCompletedCount + project.subCompletedCount} 完了</span>
                  </div>
                </div>
              )
            })
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">🤝 共有プロジェクト ({sharedProjects.length})</h2>
          {sharedProjects.length === 0 ? (
            <p className="text-sm text-gray-400">共有されたプロジェクトはありません。</p>
          ) : (
            sharedProjects.map((project) => {
              const nextTask = project.tasks[0]
              const isOwner = project.userId === user.id

              return (
                <div key={project.id} className={`relative bg-gradient-to-br from-blue-500 to-pink-500 p-4 sm:p-6 rounded-xl shadow-lg border border-blue-400 ${project.status === 'COMPLETED' ? 'opacity-60' : ''}`}>
                  <Link
                    href={`/project/${project.id}`}
                    aria-label={`${project.title} を開く`}
                    className="absolute inset-0 rounded-xl z-10"
                  />
                  <div className="pointer-events-none relative z-20 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                    <div className="flex-grow">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <h2 className={`text-lg sm:text-xl font-semibold text-white ${project.status === 'COMPLETED' ? 'line-through' : ''}`}>{project.title}</h2>
                        <div className="pointer-events-auto">
                          <ProjectStatusButton projectId={project.id} status={project.status} />
                        </div>
                      </div>
                      <p className="text-gray-200 text-sm mb-2">{project.description}</p>
                      <ProjectDate startDate={project.startDate} date={project.dueDate} isCompleted={project.status === 'COMPLETED'} />
                    </div>
                    <div className="pointer-events-auto">
                      <ProjectActions projectId={project.id} title={project.title} description={project.description || ''} startDate={project.startDate} dueDate={project.dueDate} canDelete={isOwner} />
                    </div>
                  </div>

                  {nextTask && (
                    <div className="pointer-events-none relative z-20 mt-4 p-3 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-300 mb-1">次のタスク:</p>
                      <p className="text-sm text-white font-medium">{nextTask.title}</p>
                      {nextTask.dueDate && (
                        <p className="text-xs text-gray-400 mt-1">
                          📅 {new Date(nextTask.dueDate).toLocaleDateString('ja-JP')} ({formatTimeLeft(nextTask.dueDate)})
                        </p>
                      )}
                    </div>
                  )}

                  <div className="pointer-events-none relative z-20 mt-4 flex flex-wrap gap-3 text-sm">
                    <span className="text-white">📋 残り親タスク {project.parentRemainingCount}</span>
                    <span className="text-white">📝 残り子タスク {project.subRemainingCount}</span>
                    <span className="text-white">✓ {project.parentCompletedCount + project.subCompletedCount} 完了</span>
                  </div>
                </div>
              )
            })
          )}
        </section>
      </div>
    </main>
  )
}
