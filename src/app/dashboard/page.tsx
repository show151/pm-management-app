// src/app/dashboard/page.tsx

import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-session'
import { redirect } from 'next/navigation'
import DashboardContent from '@/components/DashboardContent'

export default async function DashboardPage() {
  // 1. Better Authのユーザー情報を取得
  const user = await getAuthUser()

  // 2. 未ログインはログイン画面へ
  if (!user) {
    redirect('/login')
  }

  // 3. ユーザーがPrisma側のDBに存在するか確認し、いなければ作成（同期）
  const fallbackName = user.email?.split('@')[0] || 'New User'
  const userName = user.name?.trim() || fallbackName

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id }
    })
    
    if (!existingUser) {
      await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          name: userName,
        }
      })
    }
  } catch (e) {
    console.error("User sync error:", e)
  }

  // 4. ログインユーザーのタスク（完了済みのみ）を取得
  const allTasks = await prisma.task.findMany({
    where: {
      project: {
        OR: [
          { userId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
    },
    select: {
      id: true,
      title: true,
      status: true,
      estimatedMinutes: true,
      actualMinutes: true,
      parentId: true,
      project: {
        select: {
          id: true,
          title: true,
        }
      }
    },
  })

  // 5. ブロッカー情報を取得
  const activeBlockers = await prisma.taskBlocker.findMany({
    where: {
      resolvedAt: null,
      task: {
        project: {
          OR: [
            { userId: user.id },
            { members: { some: { userId: user.id } } },
          ],
        },
      },
    },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          project: {
            select: { id: true, title: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // 親タスクと子タスクを分離
  const parentTasks = allTasks
    .filter((t) => t.parentId === null)
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      estimatedMinutes: t.estimatedMinutes,
      actualMinutes: t.actualMinutes,
      projectId: t.project.id,
      projectTitle: t.project.title,
    }))

  const childTasks = allTasks
    .filter((t) => t.parentId !== null)
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      estimatedMinutes: t.estimatedMinutes,
      actualMinutes: t.actualMinutes,
      parentId: t.parentId,
      projectId: t.project.id,
      projectTitle: t.project.title,
    }))

  // ダッシュボード用データ（親タスクのみ）
  const dashboardTasks = parentTasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    estimatedMinutes: t.estimatedMinutes,
    actualMinutes: t.actualMinutes,
    projectId: t.projectId,
    projectTitle: t.projectTitle,
  }))

  return (
    <DashboardContent
      dashboardTasks={dashboardTasks}
      parentTasks={parentTasks}
      childTasks={childTasks}
      activeBlockers={activeBlockers}
    />
  )
}
