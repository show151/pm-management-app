// src/app/actions/modify-actions.ts
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

// ========== タスク関連 ==========

export async function undoTask(taskId: string) {
  await prisma.task.update({
    where: { id: taskId },
    data: { 
      status: 'TODO',
      actualMinutes: null // 実績時間もリセット
    },
  })
  revalidatePath('/')
}

export async function completeTask(taskId: string, actualMinutes: number, reflection?: string) {
  await prisma.task.update({
    where: { id: taskId },
    data: { 
      status: 'DONE', 
      actualMinutes: actualMinutes,
      reflection: reflection || null
    },
  })
  revalidatePath('/')
}

export async function updateTaskDate(taskId: string, dateStr: string) {
  const dueDate = dateStr ? new Date(dateStr) : null
  
  await prisma.task.update({
    where: { id: taskId },
    data: { dueDate },
  })
  
  revalidatePath('/')
}

export async function deleteTask(taskId: string) {
  await prisma.task.delete({
    where: { id: taskId }
  })
  revalidatePath('/')
}

export async function updateTask(taskId: string, title: string) {
  await prisma.task.update({
    where: { id: taskId },
    data: { title }
  })
  revalidatePath('/')
}

export async function updateTaskDetails(taskId: string, title: string, importance: number, urgency: number, estimatedMinutes: number, dueDateStr?: string) {
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
  revalidatePath('/project/[id]')
}

// ========== プロジェクト関連 ==========

export async function deleteProject(projectId: string) {
  await prisma.project.delete({
    where: { id: projectId }
  })
  revalidatePath('/')
}

export async function updateProject(projectId: string, title: string, description: string, dueDateStr?: string) {
  const dueDate = dueDateStr ? new Date(dueDateStr) : null
  await prisma.project.update({
    where: { id: projectId },
    data: { title, description, dueDate }
  })
  revalidatePath('/')
}

export async function updateProjectDate(projectId: string, dateStr: string) {
  const dueDate = dateStr ? new Date(dateStr) : null
  await prisma.project.update({
    where: { id: projectId },
    data: { dueDate }
  })
  revalidatePath('/')
}

export async function completeProject(projectId: string) {
  await prisma.project.update({
    where: { id: projectId },
    data: { status: 'COMPLETED' }
  })
  revalidatePath('/')
}

export async function reopenProject(projectId: string) {
  await prisma.project.update({
    where: { id: projectId },
    data: { status: 'ACTIVE' }
  })
  revalidatePath('/')
}

// ========== 認証関連 ==========

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
