// src/app/actions/create-actions.ts
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { assertProjectAccess, getCurrentUserOrThrow } from '@/lib/project-access'

export async function createTask(formData: FormData) {
  const authUser = await getCurrentUserOrThrow()

  const title = formData.get('title') as string
  const projectId = formData.get('projectId') as string
  const importance = formData.get('importance')
  const urgency = formData.get('urgency')
  const estimatedMinutes = formData.get('estimatedMinutes')
  const parentId = formData.get('parentId') as string | null

  const dueDateStr = formData.get('dueDate') as string
  const dueDate = dueDateStr ? new Date(dueDateStr) : null

  if (!title || !projectId) return

  await assertProjectAccess(projectId, authUser.id)

  await prisma.task.create({
    data: {
      title,
      projectId,
      parentId: parentId || null,
      // 数値型に変換して保存
      importance: Number(importance) || 3,
      urgency: Number(urgency) || 3,
      estimatedMinutes: Number(estimatedMinutes) || 0,
      dueDate: dueDate,
      status: 'TODO',
    },
  })

  revalidatePath('/')
  revalidatePath(`/project/${projectId}`)
}

export async function createProject(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return
  
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const dueDateStr = formData.get('dueDate') as string
  
  if (!title) return
  
  const dueDate = dueDateStr ? new Date(dueDateStr) : null
  
  await prisma.project.create({
    data: {
      title,
      description: description || '',
      dueDate,
      userId: user.id
    }
  })
  
  revalidatePath('/')
}
