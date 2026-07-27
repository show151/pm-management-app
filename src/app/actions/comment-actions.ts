'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUserOrThrow, assertTaskAccess } from '@/lib/project-access'

export async function addComment(taskId: string, body: string) {
  const authUser = await getCurrentUserOrThrow()
  const task = await assertTaskAccess(taskId, authUser.id)

  if (!body.trim()) {
    return { ok: false, message: 'コメントを入力してください' }
  }

  const comment = await prisma.taskComment.create({
    data: {
      taskId,
      authorId: authUser.id,
      body: body.trim(),
    },
    include: {
      author: {
        select: { id: true, email: true, name: true }
      }
    }
  })

  revalidatePath(`/project/${task.projectId}`)

  return { ok: true, comment }
}

export async function getComments(taskId: string) {
  const authUser = await getCurrentUserOrThrow()
  await assertTaskAccess(taskId, authUser.id)

  const comments = await prisma.taskComment.findMany({
    where: { taskId },
    include: {
      author: {
        select: { id: true, email: true, name: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  return { ok: true, comments }
}
