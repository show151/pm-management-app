'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { assertProjectOwner } from '@/lib/project-access'
import { getCurrentUserOrThrow } from '@/lib/project-access'

export async function archiveProject(projectId: string) {
  const authUser = await getCurrentUserOrThrow()
  await assertProjectOwner(projectId, authUser.id)

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      isArchived: true,
      archivedAt: new Date()
    }
  })

  revalidatePath('/')
  revalidatePath(`/project/${projectId}`)
  
  return { ok: true, project }
}

export async function unarchiveProject(projectId: string) {
  const authUser = await getCurrentUserOrThrow()
  await assertProjectOwner(projectId, authUser.id)

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      isArchived: false,
      archivedAt: null
    }
  })

  revalidatePath('/')
  revalidatePath(`/project/${projectId}`)
  
  return { ok: true, project }
}
