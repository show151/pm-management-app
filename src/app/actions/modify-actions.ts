// src/app/actions/modify-actions.ts
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import {
  assertProjectAccess,
  assertProjectOwner,
  assertTaskAccess,
  getCurrentUserOrThrow,
} from '@/lib/project-access'

// ========== タスク関連 ==========

export async function undoTask(taskId: string) {
  const authUser = await getCurrentUserOrThrow()
  const task = await assertTaskAccess(taskId, authUser.id)

  await prisma.task.update({
    where: { id: taskId },
    data: { 
      status: 'TODO',
      actualMinutes: null // 実績時間もリセット
    },
  })
  revalidatePath('/')
  revalidatePath(`/project/${task.projectId}`)
}

export async function completeTask(taskId: string, actualMinutes: number, reflection?: string) {
  const authUser = await getCurrentUserOrThrow()
  const task = await assertTaskAccess(taskId, authUser.id)

  await prisma.task.update({
    where: { id: taskId },
    data: { 
      status: 'DONE', 
      actualMinutes: actualMinutes,
      reflection: reflection || null
    },
  })
  revalidatePath('/')
  revalidatePath(`/project/${task.projectId}`)
}

export async function updateTaskDate(taskId: string, dateStr: string) {
  const authUser = await getCurrentUserOrThrow()
  const task = await assertTaskAccess(taskId, authUser.id)
  const dueDate = dateStr ? new Date(dateStr) : null
  
  await prisma.task.update({
    where: { id: taskId },
    data: { dueDate },
  })
  
  revalidatePath('/')
  revalidatePath(`/project/${task.projectId}`)
}

export async function deleteTask(taskId: string) {
  const authUser = await getCurrentUserOrThrow()
  const task = await assertTaskAccess(taskId, authUser.id)

  await prisma.task.delete({
    where: { id: taskId }
  })
  revalidatePath('/')
  revalidatePath(`/project/${task.projectId}`)
}

export async function updateTask(taskId: string, title: string) {
  const authUser = await getCurrentUserOrThrow()
  const task = await assertTaskAccess(taskId, authUser.id)

  await prisma.task.update({
    where: { id: taskId },
    data: { title }
  })
  revalidatePath('/')
  revalidatePath(`/project/${task.projectId}`)
}

export async function updateTaskDetails(taskId: string, title: string, importance: number, urgency: number, estimatedMinutes: number, dueDateStr?: string) {
  const authUser = await getCurrentUserOrThrow()
  const task = await assertTaskAccess(taskId, authUser.id)
  const dueDate = dueDateStr ? new Date(dueDateStr) : null
  await prisma.task.update({
    where: { id: taskId },
    data: { 
      title,
      importance,
      urgency,
      estimatedMinutes,
      dueDate
    }
  })
  revalidatePath('/')
  revalidatePath(`/project/${task.projectId}`)
}

// ========== プロジェクト関連 ==========

export async function deleteProject(projectId: string) {
  const authUser = await getCurrentUserOrThrow()
  await assertProjectOwner(projectId, authUser.id)

  await prisma.project.delete({
    where: { id: projectId }
  })
  revalidatePath('/')
}

export async function updateProject(projectId: string, title: string, description: string, dueDateStr?: string) {
  const authUser = await getCurrentUserOrThrow()
  await assertProjectAccess(projectId, authUser.id)

  const dueDate = dueDateStr ? new Date(dueDateStr) : null
  await prisma.project.update({
    where: { id: projectId },
    data: { title, description, dueDate }
  })
  revalidatePath('/')
  revalidatePath(`/project/${projectId}`)
}

export async function updateProjectDate(projectId: string, dateStr: string) {
  const authUser = await getCurrentUserOrThrow()
  await assertProjectAccess(projectId, authUser.id)

  const dueDate = dateStr ? new Date(dateStr) : null
  await prisma.project.update({
    where: { id: projectId },
    data: { dueDate }
  })
  revalidatePath('/')
  revalidatePath(`/project/${projectId}`)
}

export async function completeProject(projectId: string) {
  const authUser = await getCurrentUserOrThrow()
  await assertProjectAccess(projectId, authUser.id)

  await prisma.project.update({
    where: { id: projectId },
    data: { status: 'COMPLETED' }
  })
  revalidatePath('/')
  revalidatePath(`/project/${projectId}`)
}

export async function reopenProject(projectId: string) {
  const authUser = await getCurrentUserOrThrow()
  await assertProjectAccess(projectId, authUser.id)

  await prisma.project.update({
    where: { id: projectId },
    data: { status: 'ACTIVE' }
  })
  revalidatePath('/')
  revalidatePath(`/project/${projectId}`)
}

export async function addProjectMember(projectId: string, email: string) {
  const authUser = await getCurrentUserOrThrow()
  await assertProjectOwner(projectId, authUser.id)

  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) {
    return { ok: false, message: 'メールアドレスを入力してください。' }
  }

  const targetUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true },
  })

  if (!targetUser) {
    return { ok: false, message: 'そのメールのユーザーが見つかりません。先にログインしてもらってください。' }
  }

  if (targetUser.id === authUser.id) {
    return { ok: false, message: 'オーナーは追加できません。' }
  }

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId,
        userId: targetUser.id,
      },
    },
    update: {},
    create: {
      projectId,
      userId: targetUser.id,
    },
  })

  revalidatePath('/')
  revalidatePath(`/project/${projectId}`)
  return { ok: true, message: `${targetUser.email} をメンバーに追加しました。` }
}

export async function removeProjectMember(projectId: string, memberUserId: string) {
  const authUser = await getCurrentUserOrThrow()
  await assertProjectOwner(projectId, authUser.id)

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  })

  if (!project || project.userId === memberUserId) {
    return { ok: false, message: 'オーナーは削除できません。' }
  }

  await prisma.projectMember.deleteMany({
    where: {
      projectId,
      userId: memberUserId,
    },
  })

  revalidatePath('/')
  revalidatePath(`/project/${projectId}`)
  return { ok: true, message: 'メンバーを削除しました。' }
}

// ========== 認証関連 ==========

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
