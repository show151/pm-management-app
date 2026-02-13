'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createChildTask(formData: FormData) {
  const title = formData.get('title') as string
  const projectId = formData.get('projectId') as string
  const parentId = formData.get('parentId') as string
  const estimatedMinutes = formData.get('estimatedMinutes')
  const dueDateStr = formData.get('dueDate') as string
  const dueDate = dueDateStr ? new Date(dueDateStr) : null

  if (!title || !projectId || !parentId) return

  await prisma.task.create({
    data: {
      title,
      projectId,
      parentId,
      importance: 3,
      urgency: 3,
      estimatedMinutes: Number(estimatedMinutes) || 0,
      dueDate,
      status: 'TODO',
    },
  })

  revalidatePath('/')
  revalidatePath('/project/[id]')
}

export async function updateChildTask(taskId: string, title: string, importance: number, urgency: number, estimatedMinutes: number, dueDateStr?: string) {
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

export async function deleteChildTask(taskId: string) {
  await prisma.task.delete({
    where: { id: taskId }
  })
  revalidatePath('/')
  revalidatePath('/project/[id]')
}

export async function completeChildTask(taskId: string, actualMinutes: number, reflection?: string) {
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

export async function undoChildTask(taskId: string) {
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

export async function updateChildTaskDate(taskId: string, dateStr: string) {
  const dueDate = dateStr ? new Date(dateStr) : null
  await prisma.task.update({
    where: { id: taskId },
    data: { dueDate },
  })
  revalidatePath('/')
  revalidatePath('/project/[id]')
}
