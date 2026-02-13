import { prisma } from '@/lib/prisma'
import { createClient } from '@/utils/supabase/server'

export async function getCurrentUserOrThrow() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('UNAUTHORIZED')
  }

  return user
}

export async function canAccessProject(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { userId },
        { members: { some: { userId } } },
      ],
    },
    select: { id: true, userId: true },
  })

  return project
}

export async function assertProjectAccess(projectId: string, userId: string) {
  const project = await canAccessProject(projectId, userId)

  if (!project) {
    throw new Error('FORBIDDEN')
  }

  return project
}

export async function assertProjectOwner(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, userId: true },
  })

  if (!project || project.userId !== userId) {
    throw new Error('FORBIDDEN')
  }

  return project
}

export async function assertTaskAccess(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      projectId: true,
      project: {
        select: {
          userId: true,
          members: {
            where: { userId },
            select: { id: true },
          },
        },
      },
    },
  })

  if (!task) {
    throw new Error('NOT_FOUND')
  }

  const canAccess = task.project.userId === userId || task.project.members.length > 0
  if (!canAccess) {
    throw new Error('FORBIDDEN')
  }

  return task
}
