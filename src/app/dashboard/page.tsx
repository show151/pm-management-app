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

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: user.email! }
    })
    
    if (existingUser) {
      if (existingUser.id !== user.id) {
        // IDがSupabase側で変わっている場合（再作成時など）、古いIDを新しいIDに更新するのはPrismaでは難しいため
        // とりあえず既存のユーザーの情報をそのまま使うか、何かしらの対策が必要
        // ここではそのままにするか、email以外の情報のみ更新する
        await prisma.user.update({
          where: { email: user.email! },
          data: { name: metadataName || fallbackName }
        })
      }
    } else {
      await prisma.user.create({
        data: {
          id: user.id,
          email: user.email!,
          name: metadataName || fallbackName,
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
