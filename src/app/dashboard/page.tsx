// src/app/dashboard/page.tsx

import { prisma } from '@/lib/prisma'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DashboardContent from '@/components/DashboardContent'

export default async function DashboardPage() {
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

  const metadataName = typeof user.user_metadata?.name === 'string' ? user.user_metadata.name.trim() : ''
  const fallbackName = user.email?.split('@')[0] || 'New User'
  await prisma.user.upsert({
    where: { id: user.id },
    update: {},
    create: {
      id: user.id,
      email: user.email!,
      name: metadataName || fallbackName,
    },
  })

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
    />
  )
}
