// src/app/page.tsx

import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-session'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import NewProjectButton from '@/components/NewProjectButton'
import ProjectDate from '@/components/ProjectDate'
import ProjectStatusButton from '@/components/ProjectStatusButton'
import ProjectActions from '@/components/ProjectActions'
import Link from 'next/link'
import Dashboard from '@/components/Dashboard'
import TimelineChart from '@/components/TimelineChart'
import PushNotificationPanel from '@/components/PushNotificationPanel'

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

export default async function Home(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams
  const isArchivedView = searchParams.archived === 'true'
  const page = parseInt(searchParams.page as string || '1', 10)
  const pageSize = 10

  // 1. Better Authのユーザー情報を取得
  const user = await getAuthUser()

  // 2. 未ログインはログイン画面へ
  if (!user) {
    redirect('/login')
  }

  // 3. ユーザーがPrisma側のDBに存在するか確認し、いなければ作成（同期）
  const fallbackName = user.email?.split('@')[0] || 'New User'
  const userName = user.name?.trim() || fallbackName
  let dbUser = await prisma.user.findUnique({
    where: { id: user.id }
  })

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        name: userName,
      }
    })
  } else if (!dbUser.name && user.name) {
    dbUser = await prisma.user.update({
      where: { id: user.id },
      data: { name: user.name },
    })
  }

  const urgentDeadline = new Date()
  urgentDeadline.setDate(urgentDeadline.getDate() + 3)

  // 4. ログインユーザーのプロジェクトだけを取得（期限順・ページネーション・アーカイブ有無）
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { userId: user.id },
        { members: { some: { userId: user.id } } },
      ],
      isArchived: isArchivedView
    },
    orderBy: [
      { dueDate: 'asc' },
      { createdAt: 'desc' }
    ],
    take: pageSize,
    skip: (page - 1) * pageSize,
  })

  const totalProjects = await prisma.project.count({
    where: {
      OR: [
        { userId: user.id },
        { members: { some: { userId: user.id } } },
      ],
      isArchived: isArchivedView
    }
  })
  const totalPages = Math.ceil(totalProjects / pageSize)

  // プロジェクトの全タスクを一括取得（N+1問題の解消）
  const taskStats = await prisma.task.findMany({
    where: { projectId: { in: projects.map(p => p.id) } },
    select: { 
      projectId: true, parentId: true, status: true, 
      id: true, title: true, estimatedMinutes: true, actualMinutes: true,
      dueDate: true, createdAt: true
    }
  })

  // メモリ上で集計
  const projectsWithTaskCount = projects.map((project) => {
    const pTasks = taskStats.filter(t => t.projectId === project.id)
    
    const parentRemainingCount = pTasks.filter(t => t.parentId === null && t.status !== 'DONE').length
    const subRemainingCount = pTasks.filter(t => t.parentId !== null && t.status !== 'DONE').length
    const parentCompletedCount = pTasks.filter(t => t.parentId === null && t.status === 'DONE').length
    const subCompletedCount = pTasks.filter(t => t.parentId !== null && t.status === 'DONE').length

    // 次のタスクを計算
    const activeSubTasks = pTasks.filter(t => t.status !== 'DONE' && t.parentId !== null)
    activeSubTasks.sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime()
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return a.createdAt.getTime() - b.createdAt.getTime()
    })
    const nextTask = activeSubTasks[0] || null

    return { 
      ...project, 
      tasks: nextTask ? [nextTask] : [],
      allTasks: pTasks, // ダッシュボード用に保持
      parentRemainingCount, subRemainingCount, parentCompletedCount, subCompletedCount 
    }
  })

  // ダッシュボード用のタスクデータ
  const allTasksForDashboard = projectsWithTaskCount.flatMap(p => 
    p.allTasks.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status as string,
      estimatedMinutes: t.estimatedMinutes,
      actualMinutes: t.actualMinutes,
    }))
  )

  const projectTimelineItems = projectsWithTaskCount.map((project) => ({
    id: project.id,
    title: project.title,
    startDate: project.startDate ?? project.createdAt,
    endDate: project.dueDate,
    status: project.status as string,
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

  const actionButtonClass = 'btn btn-primary w-full sm:w-auto'
  const projectCardClass = 'ui-panel-accent relative overflow-hidden p-4 sm:p-5'

  return (
    <main className="app-shell">
      <div className="app-container">
        
        <Header email={user?.email || 'Guest'} name={dbUser?.name || fallbackName} />
        <PushNotificationPanel />

        {/* ↓ ここにダッシュボードを配置 */}
        <Dashboard tasks={allTasksForDashboard} />
        <TimelineChart
          title="プロジェクトタイムライン"
          emptyMessage="表示できるプロジェクトがありません。"
          items={projectTimelineItems}
        />

        <div className="ui-panel rounded-xl p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {urgentTasks.length > 0 && (
            <div className="w-full grow rounded-lg border border-red-500/70 bg-red-900/45 p-3 sm:p-4">
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
          <div className="w-full sm:w-auto grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <Link
              href="/dashboard"
              className={actionButtonClass}
            >
              <span>📊</span>
              <span>ダッシュボード</span>
            </Link>
            <NewProjectButton className={actionButtonClass} />
            </div>
          </div>
          </div>

        <div className="flex justify-between items-center my-4">
          <Link
            href={isArchivedView ? '/' : '/?archived=true'}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            {isArchivedView ? '通常プロジェクトを表示' : 'アーカイブ済みを表示'}
          </Link>
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
                <div key={project.id} className={`${projectCardClass} ${project.status === 'COMPLETED' ? 'opacity-65' : ''}`}>
                  <Link
                    href={`/project/${project.id}`}
                    aria-label={`${project.title} を開く`}
                    className="absolute inset-0 rounded-2xl z-10"
                  />
                  <div className="pointer-events-none relative z-20 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-3">
                    <div className="grow space-y-2 rounded-lg bg-black/15 p-3">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <h2 className={`text-lg sm:text-xl font-semibold text-white ${project.status === 'COMPLETED' ? 'line-through' : ''}`}>{project.title}</h2>
                        <div className="pointer-events-auto">
                          <ProjectStatusButton projectId={project.id} status={project.status} />
                        </div>
                      </div>
                      <p className="text-gray-200 text-sm mb-2">{project.description}</p>
                      <ProjectDate startDate={project.startDate} date={project.dueDate} isCompleted={project.status === 'COMPLETED'} />
                    </div>
                    <div className="pointer-events-none w-full sm:w-auto sm:min-w-[18rem] flex flex-col gap-3">
                      <div className="pointer-events-auto self-start sm:self-end">
                        <ProjectActions 
                          projectId={project.id} 
                          title={project.title} 
                          description={project.description || ''} 
                          startDate={project.startDate} 
                          dueDate={project.dueDate} 
                          canDelete={isOwner} 
                          status={project.status}
                          isArchived={project.isArchived}
                        />
                      </div>
                      {nextTask && (
                        <div className="rounded-lg border border-sky-300/30 bg-slate-900/55 p-3">
                          <p className="text-xs text-gray-300 mb-1">次のタスク:</p>
                          <p className="text-sm text-white font-medium">{nextTask.title}</p>
                          {nextTask.dueDate && (
                            <p className="text-xs text-gray-400 mt-1">
                              📅 {new Date(nextTask.dueDate).toLocaleDateString('ja-JP')} ({formatTimeLeft(nextTask.dueDate)})
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pointer-events-none relative z-20 mt-4 flex flex-wrap gap-2 text-sm">
                    <span className="stat-pill">📋 残り親タスク {project.parentRemainingCount}</span>
                    <span className="stat-pill">📝 残り子タスク {project.subRemainingCount}</span>
                    <span className="stat-pill">✓ {project.parentCompletedCount + project.subCompletedCount} 完了</span>
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
                <div key={project.id} className={`${projectCardClass} ${project.status === 'COMPLETED' ? 'opacity-65' : ''}`}>
                  <Link
                    href={`/project/${project.id}`}
                    aria-label={`${project.title} を開く`}
                    className="absolute inset-0 rounded-2xl z-10"
                  />
                  <div className="pointer-events-none relative z-20 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-3">
                    <div className="grow space-y-2 rounded-lg bg-black/15 p-3">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <h2 className={`text-lg sm:text-xl font-semibold text-white ${project.status === 'COMPLETED' ? 'line-through' : ''}`}>{project.title}</h2>
                        <div className="pointer-events-auto">
                          <ProjectStatusButton projectId={project.id} status={project.status} />
                        </div>
                      </div>
                      <p className="text-gray-200 text-sm mb-2">{project.description}</p>
                      <ProjectDate startDate={project.startDate} date={project.dueDate} isCompleted={project.status === 'COMPLETED'} />
                    </div>
                    <div className="pointer-events-none w-full sm:w-auto sm:min-w-[18rem] flex flex-col gap-3">
                      <div className="pointer-events-auto self-start sm:self-end">
                        <ProjectActions 
                          projectId={project.id} 
                          title={project.title} 
                          description={project.description || ''} 
                          startDate={project.startDate} 
                          dueDate={project.dueDate} 
                          canDelete={isOwner} 
                          status={project.status}
                          isArchived={project.isArchived}
                        />
                      </div>
                      {nextTask && (
                        <div className="rounded-lg border border-sky-300/30 bg-slate-900/55 p-3">
                          <p className="text-xs text-gray-300 mb-1">次のタスク:</p>
                          <p className="text-sm text-white font-medium">{nextTask.title}</p>
                          {nextTask.dueDate && (
                            <p className="text-xs text-gray-400 mt-1">
                              📅 {new Date(nextTask.dueDate).toLocaleDateString('ja-JP')} ({formatTimeLeft(nextTask.dueDate)})
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pointer-events-none relative z-20 mt-4 flex flex-wrap gap-2 text-sm">
                    <span className="stat-pill">📋 残り親タスク {project.parentRemainingCount}</span>
                    <span className="stat-pill">📝 残り子タスク {project.subRemainingCount}</span>
                    <span className="stat-pill">✓ {project.parentCompletedCount + project.subCompletedCount} 完了</span>
                  </div>
                </div>
              )
            })
          )}
        </section>

        {totalPages > 1 && (
          <div className="flex justify-center gap-4 mt-8">
            {page > 1 && (
              <Link
                href={`/?page=${page - 1}${isArchivedView ? '&archived=true' : ''}`}
                className="btn btn-secondary px-6"
              >
                前のページ
              </Link>
            )}
            <span className="text-gray-400 py-2">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/?page=${page + 1}${isArchivedView ? '&archived=true' : ''}`}
                className="btn btn-secondary px-6"
              >
                次のページ
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
