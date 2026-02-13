'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createParentTask(formData: FormData) {
  const title = formData.get('title') as string
  const projectId = formData.get('projectId') as string
  const importance = formData.get('importance')
  const urgency = formData.get('urgency')
  const estimatedMinutes = formData.get('estimatedMinutes')
  const dueDateStr = formData.get('dueDate') as string
  const dueDate = dueDateStr ? new Date(dueDateStr) : null

  if (!title || !projectId) return

  await prisma.task.create({
    data: {
      title,
      projectId,
      parentId: null,
      importance: Number(importance) || 3,
      urgency: Number(urgency) || 3,
      estimatedMinutes: Number(estimatedMinutes) || 0,
      dueDate,
      status: 'TODO',
    },
  })

  revalidatePath('/')
  revalidatePath('/project/[id]')
}

export async function updateParentTask(taskId: string, title: string, importance: number, urgency: number, estimatedMinutes: number, dueDateStr?: string) {
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

export async function deleteParentTask(taskId: string) {
  await prisma.task.delete({
    where: { id: taskId }
  })
  revalidatePath('/')
  revalidatePath('/project/[id]')
}

export async function completeParentTask(taskId: string, actualMinutes: number, reflection?: string) {
  await prisma.task.update({
    where: { id: taskId },
    data: { 
      status: 'DONE', 
      actualMinutes,
      reflection: reflection || null
    },
  })
  revalidatePath('/')
  revalidatePath('/project/[id]')
}

export async function undoParentTask(taskId: string) {
  await prisma.task.update({
    where: { id: taskId },
    data: { 
      status: 'TODO',
      actualMinutes: null
    },
  })
  revalidatePath('/')
  revalidatePath('/project/[id]')
}
