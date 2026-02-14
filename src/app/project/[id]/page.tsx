// src/app/project/[id]/page.tsx

import { prisma } from '@/lib/prisma'
import { createClient } from '@/utils/supabase/server'
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

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  let user: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']['user'] | null = null

  try {
    const { data } = await supabase.auth.getSession()
    user = data.session?.user ?? null
  } catch {
    user = null
  }

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
          children: {
            orderBy: [
              { dueDate: 'asc' },
              { createdAt: 'asc' }
            ]
          }
        }
      }
    }
  })

  if (!project) {
    redirect('/')
  }

  const isOwner = project.userId === user.id

  return (
    <main className="min-h-screen p-8 bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/" className="text-blue-400 hover:text-blue-300 flex items-center gap-2">
          ← プロジェクト一覧に戻る
        </Link>

        <div className="bg-gradient-to-br from-blue-500 to-pink-500 p-6 rounded-xl shadow-lg border border-blue-400">
          <div className="flex items-center gap-3 mb-2">
            <h1 className={`text-2xl font-bold text-white ${project.status === 'COMPLETED' ? 'line-through' : ''}`}>{project.title}</h1>
            <ProjectStatusButton projectId={project.id} status={project.status} />
          </div>
          <p className="text-gray-200 mb-3">{project.description}</p>
          <ProjectDate date={project.dueDate} isCompleted={project.status === 'COMPLETED'} />
        </div>

        <ProjectMembersPanel
          projectId={project.id}
          owner={project.user}
          members={project.members.map((member) => member.user)}
          isOwner={isOwner}
        />

        <div className="mb-6">
          <NewTaskForm projectId={project.id} />
        </div>

        <div className="space-y-4">
          {project.tasks.length > 0 ? (
            project.tasks.map((task) => (
              <div key={task.id} className="border border-blue-700 rounded-lg overflow-hidden">
                <div className={`p-4 flex justify-between items-center transition-colors ${task.status === 'DONE' ? 'bg-gray-800 opacity-70' : 'bg-gray-900'}`}>
                  <div className="flex-grow">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-bold text-lg ${task.status === 'DONE' ? 'line-through text-gray-500' : 'text-white'}`}>
                        {task.title}
                      </h3>
                      <TaskActions taskId={task.id} title={task.title} importance={task.importance} urgency={task.urgency} estimatedMinutes={task.estimatedMinutes} dueDate={task.dueDate} />
                    </div>
                    <TaskDate date={task.dueDate} isDone={task.status === 'DONE'} />
                    <div className="text-xs text-gray-300 mt-1 flex gap-2">
                      <span className="bg-blue-400 text-white px-2 py-0.5 rounded">重要: {task.importance}</span>
                      <span className="bg-pink-400 text-white px-2 py-0.5 rounded">緊急: {task.urgency}</span>
                      <span className="bg-gray-700 text-gray-200 px-2 py-0.5 rounded">予定: {task.estimatedMinutes}分</span>
                    </div>
                  </div>
                  <TaskStatusButton 
                    taskId={task.id} 
                    status={task.status} 
                    actualMinutes={task.actualMinutes}
                    estimatedMinutes={task.estimatedMinutes} 
                    reflection={task.reflection}
                    isSubTask={false}
                  />
                </div>

                <div className="bg-gray-800 p-3 border-t border-gray-600 pl-8">
                  {task.children.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {task.children.map((subTask) => (
                        <div key={subTask.id} className="flex justify-between items-center bg-gray-700 p-2 rounded border border-gray-600 text-sm">
                          <div className="flex items-center gap-2 flex-grow">
                            <span className="text-gray-500">└</span>
                            <TaskDate date={subTask.dueDate} isDone={subTask.status === 'DONE'} isSubTask={true} />
                            <span className={subTask.status === 'DONE' ? 'line-through text-gray-500' : 'text-white'}>
                              {subTask.title}
                            </span>
                            {subTask.estimatedMinutes && (
                              <span className="text-[10px] text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">
                                {subTask.estimatedMinutes}分
                              </span>
                            )}
                            <TaskActions taskId={subTask.id} title={subTask.title} importance={subTask.importance} urgency={subTask.urgency} estimatedMinutes={subTask.estimatedMinutes} dueDate={subTask.dueDate} />
                          </div>
                          <div className="scale-90 origin-right">
                            <TaskStatusButton 
                              taskId={subTask.id} 
                              status={subTask.status} 
                              actualMinutes={subTask.actualMinutes}
                              estimatedMinutes={subTask.estimatedMinutes}
                              reflection={subTask.reflection}
                              isSubTask={true}
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
                      <form action={createTask} className="flex gap-2 items-center">
                        <input type="hidden" name="projectId" value={project.id} />
                        <input type="hidden" name="parentId" value={task.id} />
                        <input 
                          type="date" 
                          name="dueDate" 
                          className="border border-gray-600 bg-gray-700 text-white rounded px-1 py-1 text-xs w-28 [color-scheme:dark]" 
                        />
                        <input 
                          name="title" 
                          placeholder="小タスク名..." 
                          className="border border-gray-600 bg-gray-700 text-white rounded px-2 py-1 flex-grow"
                          required 
                        />
                        <input 
                          name="estimatedMinutes" 
                          type="number" 
                          placeholder="分" 
                          className="w-12 border border-gray-600 bg-gray-700 text-white rounded px-1 py-1"
                        />
                        <button type="submit" className="border-2 border-white text-white font-bold px-3 py-1 rounded hover:bg-white hover:text-blue-600 transition-all">追加</button>
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
      </div>
    </main>
  )
}
