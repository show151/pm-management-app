// src/app/project/[id]/page.tsx

import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NewTaskForm from '@/components/NewTaskForm'
import TaskStatusButton from '@/components/TaskStatusButton'
import TaskDate from '@/components/TaskDate'
import TaskActions from '@/components/TaskActions'
import { createTask } from '@/app/actions/create-actions'
import ProjectDate from '@/components/ProjectDate'
import ProjectStatusButton from '@/components/ProjectStatusButton'
import ProjectMembersPanel from '@/components/ProjectMembersPanel'
import TaskTimelineChart from '@/components/TaskTimelineChart'
import ProjectGanttChart, { GanttTask } from '@/components/ProjectGanttChart'
import TaskBlockerUI from '@/components/TaskBlockerUI'
import TaskComments from '@/components/TaskComments'
import PriorityMatrix from '@/components/PriorityMatrix'
import CloseDetailsButton from '@/components/CloseDetailsButton'

export default async function ProjectPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await props.params
  const searchParams = await props.searchParams
  const tab = searchParams.tab || 'list'
  const user = await getAuthUser()

  if (!user) {
    redirect('/login')
  }

  const project = await prisma.project.findFirst({
    where: {
      id,
      OR: [
        { userId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      tasks: {
        where: { parentId: null },
        orderBy: [
          { dueDate: 'asc' },
          { createdAt: 'asc' }
        ],
        include: {
          assignee: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          predecessors: true,
          dependents: true,
          blockers: true,
          _count: { select: { comments: true } },
          children: {
            orderBy: [
              { dueDate: 'asc' },
              { createdAt: 'asc' }
            ],
            include: {
              assignee: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
              predecessors: true,
              dependents: true,
              blockers: true,
              _count: { select: { comments: true } },
            },
          }
        }
      }
    }
  })

  if (!project) {
    redirect('/')
  }

  const isOwner = project.userId === user.id
  const assigneeOptions = [
    project.user,
    ...project.members.map((member) => member.user),
  ]
    .reduce<Array<{ id: string; label: string }>>((acc, member) => {
      if (acc.some((item) => item.id === member.id)) return acc
      const labelBase = member.name?.trim() || member.email
      const label = member.id === project.userId ? `${labelBase} (オーナー)` : labelBase
      acc.push({ id: member.id, label })
      return acc
    }, [])

  // 依存関係設定などのためにプロジェクト内の全タスクを平坦なリストにする
  const allTasks = project.tasks.reduce<Array<{ id: string; title: string; status: string }>>((acc, task) => {
    acc.push({ id: task.id, title: task.title, status: task.status })
    task.children.forEach(child => {
      acc.push({ id: child.id, title: child.title, status: child.status })
    })
    return acc
  }, [])

  // メンバー別のリソース負荷状況をDB側で集計
  const taskGroupStats = await prisma.task.groupBy({
    by: ['assigneeId'],
    where: { 
      projectId: id, 
      status: { in: ['TODO', 'IN_PROGRESS'] },
      assigneeId: { not: null }
    },
    _count: { id: true },
    _sum: { estimatedMinutes: true }
  })

  const memberStats: Record<string, { activeTaskCount: number; totalEstimatedMinutes: number }> = {}
  assigneeOptions.forEach(opt => {
    const stat = taskGroupStats.find(s => s.assigneeId === opt.id)
    memberStats[opt.id] = { 
      activeTaskCount: stat?._count.id || 0, 
      totalEstimatedMinutes: stat?._sum.estimatedMinutes || 0 
    }
  })

  const taskTimelineItems = project.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    startDate: (task.startDate ?? task.createdAt).toISOString(),
    endDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
    status: task.status,
    children: task.children.map((subTask) => ({
      id: subTask.id,
      title: subTask.title,
      startDate: (subTask.startDate ?? subTask.createdAt).toISOString(),
      endDate: subTask.dueDate ? new Date(subTask.dueDate).toISOString() : null,
      status: subTask.status,
    })),
  }))

  const ganttTasks: GanttTask[] = project.tasks.flatMap(task => {
    const parent: GanttTask = {
      id: task.id,
      title: task.title,
      startDate: (task.startDate ?? task.createdAt).toISOString(),
      endDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
      status: task.status,
      isChild: false,
      parentId: null,
      predecessors: task.predecessors,
      dependents: task.dependents
    }
    const children: GanttTask[] = task.children.map(child => ({
      id: child.id,
      title: child.title,
      startDate: (child.startDate ?? child.createdAt).toISOString(),
      endDate: child.dueDate ? new Date(child.dueDate).toISOString() : null,
      status: child.status,
      isChild: true,
      parentId: task.id,
      predecessors: child.predecessors,
      dependents: child.dependents
    }))
    return [parent, ...children]
  })

  return (
    <main className="app-shell">
      <div className="app-container">
        <div className="flex items-center gap-4">
          <Link href="/" className="btn btn-secondary text-sm">
            ← プロジェクト一覧に戻る
          </Link>
        </div>

        <div className="ui-panel-accent p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
            <h1 className={`text-xl sm:text-2xl font-bold text-white ${project.status === 'COMPLETED' ? 'line-through' : ''}`}>{project.title}</h1>
            <ProjectStatusButton projectId={project.id} status={project.status} />
          </div>
          <p className="text-gray-200 mb-3">{project.description}</p>
          <ProjectDate startDate={project.startDate} date={project.dueDate} isCompleted={project.status === 'COMPLETED'} />
        </div>

        <ProjectMembersPanel
          projectId={project.id}
          owner={project.user}
          members={project.members.map((member) => member.user)}
          isOwner={isOwner}
          memberStats={memberStats}
        />

        <div className="flex gap-2 mb-4 border-b border-gray-700 pb-2 mt-4">
          <Link 
            href={`/project/${project.id}?tab=list`} 
            className={`px-4 py-2 text-sm font-bold ${tab === 'list' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-300'}`}
          >
            リスト＆タイムライン
          </Link>
          <Link 
            href={`/project/${project.id}?tab=gantt`} 
            className={`px-4 py-2 text-sm font-bold ${tab === 'gantt' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-300'}`}
          >
            ガントチャート
          </Link>
          <Link 
            href={`/project/${project.id}?tab=matrix`} 
            className={`px-4 py-2 text-sm font-bold ${tab === 'matrix' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-300'}`}
          >
            優先度マトリクス
          </Link>
        </div>

        {tab === 'matrix' ? (
          <div className="mb-6">
            <PriorityMatrix tasks={allTasks.map(t => {
              const full = project.tasks.find(pt => pt.id === t.id) || project.tasks.flatMap(pt => pt.children).find(c => c.id === t.id)
              return {
                id: t.id,
                title: t.title,
                status: t.status,
                importance: full?.importance ?? 3,
                urgency: full?.urgency ?? 3,
              }
            })} />
          </div>
        ) : tab === 'gantt' ? (
          <div className="mb-6">
            <ProjectGanttChart tasks={ganttTasks} />
          </div>
        ) : (
          <>
            <TaskTimelineChart items={taskTimelineItems} />

            <div className="my-6">
              <NewTaskForm projectId={project.id} assigneeOptions={assigneeOptions} />
            </div>

            <div className="space-y-4">
              {project.tasks.length > 0 ? (
            project.tasks.map((task) => (
              <div key={task.id} className="border border-blue-700 rounded-lg overflow-hidden">
                <div className={`p-4 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 transition-colors ${task.status === 'DONE' ? 'bg-slate-800/80 opacity-70' : 'bg-slate-900/70'}`}>
                  <div className="flex-grow">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`font-bold text-lg ${task.status === 'DONE' ? 'line-through text-gray-500' : 'text-white'}`}>
                        {task.title}
                      </h3>
                      <TaskActions
                        taskId={task.id}
                        title={task.title}
                        importance={task.importance}
                        urgency={task.urgency}
                        estimatedMinutes={task.estimatedMinutes}
                        startDate={task.startDate}
                        dueDate={task.dueDate}
                        assigneeId={task.assigneeId}
                        assigneeOptions={assigneeOptions}
                        isSubTask={false}
                        predecessors={task.predecessors}
                        allTasks={allTasks}
                      />
                    </div>
                    <TaskDate startDate={task.startDate} date={task.dueDate} isDone={task.status === 'DONE'} />
                    <div className="mt-2">
                      <TaskBlockerUI taskId={task.id} blockers={task.blockers} />
                    </div>
                    <div className="text-xs text-gray-300 mt-2 flex flex-wrap gap-2">
                      <span className="bg-blue-400 text-white px-2 py-0.5 rounded">重要: {task.importance}</span>
                      <span className="bg-pink-400 text-white px-2 py-0.5 rounded">緊急: {task.urgency}</span>
                      <span className="bg-gray-700 text-gray-200 px-2 py-0.5 rounded">予定: {task.estimatedMinutes}分</span>
                      <span className="bg-indigo-500/70 text-white px-2 py-0.5 rounded">
                        担当: {task.assignee?.name || task.assignee?.email || '未割当'}
                      </span>
                      <TaskComments taskId={task.id} taskTitle={task.title} commentCount={task._count.comments} />
                    </div>
                  </div>
                  <TaskStatusButton 
                    taskId={task.id} 
                    status={task.status} 
                    actualMinutes={task.actualMinutes}
                    estimatedMinutes={task.estimatedMinutes} 
                    reflection={task.reflection}
                    startDate={task.startDate}
                    dueDate={task.dueDate}
                    actualStartAt={task.actualStartAt}
                    actualEndAt={task.actualEndAt}
                    isSubTask={false}
                    predecessors={task.predecessors}
                    allTasks={allTasks}
                  />
                </div>

                <div className="bg-gray-800 p-3 sm:pl-8 border-t border-gray-600">
                  {task.children.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {task.children.map((subTask) => (
                        <div
                          key={subTask.id}
                          className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 bg-gray-700 p-2.5 rounded border border-gray-600 text-sm"
                        >
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-gray-500 leading-6 shrink-0">└</span>
                              <div className="shrink-0">
                                <TaskDate date={subTask.dueDate} isDone={subTask.status === 'DONE'} isSubTask={true} />
                                <div className="mt-1">
                                  <TaskBlockerUI taskId={subTask.id} blockers={subTask.blockers} />
                                </div>
                              </div>
                              <span
                                className={`min-w-0 break-words leading-6 ${
                                  subTask.status === 'DONE' ? 'line-through text-gray-500' : 'text-white'
                                }`}
                              >
                                {subTask.title}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 pl-5 md:pl-0">
                              {subTask.estimatedMinutes && (
                                <span className="text-[10px] text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">
                                  {subTask.estimatedMinutes}分
                                </span>
                              )}
                              <TaskActions
                                taskId={subTask.id}
                                title={subTask.title}
                                importance={subTask.importance}
                                urgency={subTask.urgency}
                                estimatedMinutes={subTask.estimatedMinutes}
                                startDate={subTask.startDate}
                                dueDate={subTask.dueDate}
                                assigneeId={subTask.assigneeId}
                                assigneeOptions={assigneeOptions}
                                isSubTask={true}
                                predecessors={subTask.predecessors}
                                allTasks={allTasks}
                              />
                              <span className="text-[10px] text-indigo-200 bg-indigo-900/40 px-1.5 py-0.5 rounded">
                                担当: {subTask.assignee?.name || subTask.assignee?.email || '未割当'}
                              </span>
                              <TaskComments taskId={subTask.id} taskTitle={subTask.title} commentCount={subTask._count.comments} />
                            </div>
                          </div>
                          <div className="w-full md:w-auto md:shrink-0">
                            <TaskStatusButton
                              taskId={subTask.id}
                              status={subTask.status}
                              actualMinutes={subTask.actualMinutes}
                              estimatedMinutes={subTask.estimatedMinutes}
                              reflection={subTask.reflection}
                              startDate={subTask.startDate}
                              dueDate={subTask.dueDate}
                              actualStartAt={subTask.actualStartAt}
                              actualEndAt={subTask.actualEndAt}
                              isSubTask={true}
                              predecessors={subTask.predecessors}
                              allTasks={allTasks}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <details className="text-xs">
                    <summary className="cursor-pointer text-blue-400 hover:text-blue-300 font-medium mb-2 inline-block">
                      ＋ サブタスクを追加
                    </summary>
                    <div className="pl-4 border-l-2 border-blue-700">
                      <form action={createTask} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 items-center">
                        <input type="hidden" name="projectId" value={project.id} />
                        <input type="hidden" name="parentId" value={task.id} />
                        <input 
                          type="date" 
                          name="dueDate" 
                          className="form-control px-2 py-1 text-xs w-full md:w-auto [color-scheme:dark]"
                        />
                        <input 
                          name="title" 
                          placeholder="小タスク名..." 
                          className="form-control px-2 py-1 md:col-span-2 lg:col-span-1"
                          required 
                        />
                        <input 
                          name="estimatedMinutes" 
                          type="number" 
                          placeholder="分" 
                          className="form-control w-full px-1 py-1"
                        />
                        <select name="assigneeId" className="form-control px-2 py-1 text-xs w-full md:w-auto" defaultValue="">
                          <option value="">担当: 未割当</option>
                          {assigneeOptions.map((option) => (
                            <option key={`sub-assignee-${task.id}-${option.id}`} value={option.id}>
                              担当: {option.label}
                            </option>
                          ))}
                        </select>
                        <div className="md:col-span-2 lg:col-span-1 flex gap-2">
                          <button type="submit" className="btn btn-primary flex-1 px-3 py-1">追加</button>
                          <CloseDetailsButton className="btn btn-secondary flex-1 px-3 py-1 text-center">
                            キャンセル
                          </CloseDetailsButton>
                        </div>
                      </form>
                    </div>
                  </details>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-4">タスクはありません</p>
          )}
        </div>
        </>
        )}
      </div>
    </main>
  )
}
