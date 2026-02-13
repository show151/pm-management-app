'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

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

export async function updateProject(projectId: string, title: string, description: string, dueDateStr?: string) {
  const dueDate = dueDateStr ? new Date(dueDateStr) : null
  await prisma.project.update({
    where: { id: projectId },
    data: { title, description, dueDate }
  })
  revalidatePath('/')
}

export async function deleteProject(projectId: string) {
  await prisma.project.delete({
    where: { id: projectId }
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
