// src/app/actions/create-actions.ts
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getAuthUserOrThrow } from '@/lib/auth-session'
import { assertProjectAccess, getCurrentUserOrThrow } from '@/lib/project-access'
import { enqueueTaskAssignedEvent, syncTaskDeadlineEvents } from '@/lib/notifications'

export async function createTask(formData: FormData) {
  const authUser = await getCurrentUserOrThrow()

  const title = formData.get('title') as string
  const projectId = formData.get('projectId') as string
  const importance = formData.get('importance')
  const urgency = formData.get('urgency')
  const estimatedMinutes = formData.get('estimatedMinutes')
  const parentId = formData.get('parentId') as string | null
  const assigneeIdRaw = (formData.get('assigneeId') as string | null) ?? ''
  const assigneeId = assigneeIdRaw.trim() || null
  const predecessorIdRaw = formData.get('predecessorId') as string | null
  const predecessorId = predecessorIdRaw?.trim() || null

  const startDateStr = formData.get('startDate') as string
  const dueDateStr = formData.get('dueDate') as string
  const startDate = startDateStr ? new Date(startDateStr) : null
  const dueDate = dueDateStr ? new Date(dueDateStr) : null

  if (!title || !projectId) return

  await assertProjectAccess(projectId, authUser.id)

  if (assigneeId) {
    const validAssignee = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [{ userId: assigneeId }, { members: { some: { userId: assigneeId } } }],
      },
      select: { id: true },
    })
    if (!validAssignee) {
      throw new Error('INVALID_ASSIGNEE')
    }
  }

  const createdTask = await prisma.task.create({
    data: {
      title,
      projectId,
      parentId: parentId || null,
      assigneeId,
      // 数値型に変換して保存
      importance: Number(importance) || 3,
      urgency: Number(urgency) || 3,
      estimatedMinutes: Number(estimatedMinutes) || 0,
      startDate,
      dueDate: dueDate,
      status: 'TODO',
      predecessors: predecessorId ? {
        create: [{ predecessorId }]
      } : undefined,
    },
  })
  if (assigneeId) {
    await enqueueTaskAssignedEvent(createdTask.id, assigneeId)
  }
  await syncTaskDeadlineEvents(createdTask.id)

  revalidatePath('/')
  revalidatePath(`/project/${projectId}`)
}

export async function createProject(formData: FormData) {
  const user = await getAuthUserOrThrow()
  
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const startDateStr = formData.get('startDate') as string
  const dueDateStr = formData.get('dueDate') as string
  
  if (!title) return
  
  const startDate = startDateStr ? new Date(startDateStr) : null
  const dueDate = dueDateStr ? new Date(dueDateStr) : null
  
  await prisma.project.create({
    data: {
      title,
      description: description || '',
      startDate,
      dueDate,
      userId: user.id
    }
  })
  
  revalidatePath('/')
}
