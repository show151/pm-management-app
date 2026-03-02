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
import {
  cancelPendingTaskNotifications,
  enqueueTaskAssignedEvent,
  enqueueTaskStatusChangedEvents,
  syncTaskDeadlineEvents,
} from '@/lib/notifications'

// ========== タスク関連 ==========

export async function undoTask(taskId: string) {
  const authUser = await getCurrentUserOrThrow()
  const task = await assertTaskAccess(taskId, authUser.id)

  await prisma.task.update({
    where: { id: taskId },
    data: { 
      status: 'TODO',
      actualMinutes: null, // 実績時間もリセット
      actualStartAt: null,
      actualEndAt: null,
    },
  })
  await enqueueTaskStatusChangedEvents(taskId, 'TODO')
  await syncTaskDeadlineEvents(taskId)
  revalidatePath('/')
  revalidatePath(`/project/${task.projectId}`)
}

export async function startTask(taskId: string) {
  const authUser = await getCurrentUserOrThrow()
  const task = await assertTaskAccess(taskId, authUser.id)

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'IN_PROGRESS',
      actualStartAt: new Date(),
    },
  })
  await enqueueTaskStatusChangedEvents(taskId, 'IN_PROGRESS')
  revalidatePath('/')
  revalidatePath(`/project/${task.projectId}`)
}

export async function completeTask(taskId: string, actualMinutes: number, reflection?: string) {
  const authUser = await getCurrentUserOrThrow()
  const task = await assertTaskAccess(taskId, authUser.id)
  const taskWithChildren = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      parentId: true,
      children: {
        select: {
          status: true,
          actualMinutes: true,
        },
      },
    },
  })

  if (!taskWithChildren) {
    throw new Error('NOT_FOUND')
  }

  const computedActualMinutes =
    taskWithChildren.parentId === null
      ? taskWithChildren.children.reduce((sum, child) => {
          if (child.status !== 'DONE') return sum
          return sum + (child.actualMinutes ?? 0)
        }, 0)
      : actualMinutes

  await prisma.task.update({
    where: { id: taskId },
    data: { 
      status: 'DONE', 
      actualMinutes: computedActualMinutes,
      reflection: reflection || null,
      actualEndAt: new Date(),
      actualStartAt: task.status === 'TODO' ? new Date() : undefined,
    },
  })
  await enqueueTaskStatusChangedEvents(taskId, 'DONE')
  await cancelPendingTaskNotifications(taskId)
  revalidatePath('/')
  revalidatePath(`/project/${task.projectId}`)
}

export async function updateSubTaskActualMinutes(taskId: string, actualMinutes: number) {
  const authUser = await getCurrentUserOrThrow()
  const task = await assertTaskAccess(taskId, authUser.id)
  const subTask = await prisma.task.findUnique({
    where: { id: taskId },
    select: { parentId: true },
  })

  if (!subTask?.parentId) {
    throw new Error('NOT_SUBTASK')
  }

  const normalizedMinutes = Number.isFinite(actualMinutes)
    ? Math.max(0, Math.floor(actualMinutes))
    : 0

  await prisma.task.update({
    where: { id: taskId },
    data: { actualMinutes: normalizedMinutes },
  })

  const parent = await prisma.task.findUnique({
    where: { id: subTask.parentId },
    select: {
      id: true,
      status: true,
      children: {
        select: {
          status: true,
          actualMinutes: true,
        },
      },
    },
  })

  if (parent?.status === 'DONE') {
    const recomputedParentActualMinutes = parent.children.reduce((sum, child) => {
      if (child.status !== 'DONE') return sum
      return sum + (child.actualMinutes ?? 0)
    }, 0)

    await prisma.task.update({
      where: { id: parent.id },
      data: { actualMinutes: recomputedParentActualMinutes },
    })
  }

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
  await syncTaskDeadlineEvents(taskId)
  
  revalidatePath('/')
  revalidatePath(`/project/${task.projectId}`)
}

export async function deleteTask(taskId: string) {
  const authUser = await getCurrentUserOrThrow()
  const task = await assertTaskAccess(taskId, authUser.id)
  await cancelPendingTaskNotifications(taskId)

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

export async function updateTaskDetails(
  taskId: string,
  title: string,
  importance: number,
  urgency: number,
  estimatedMinutes: number,
  startDateStr?: string,
  dueDateStr?: string,
  assigneeIdRaw?: string
) {
  const authUser = await getCurrentUserOrThrow()
  const task = await assertTaskAccess(taskId, authUser.id)
  const startDate = startDateStr ? new Date(startDateStr) : null
  const dueDate = dueDateStr ? new Date(dueDateStr) : null
  const assigneeId = assigneeIdRaw?.trim() ? assigneeIdRaw.trim() : null

  const currentTask = await prisma.task.findUnique({
    where: { id: taskId },
    select: { assigneeId: true },
  })
  const previousAssigneeId = currentTask?.assigneeId ?? null

  if (assigneeId) {
    const validAssignee = await prisma.project.findFirst({
      where: {
        id: task.projectId,
        OR: [{ userId: assigneeId }, { members: { some: { userId: assigneeId } } }],
      },
      select: { id: true },
    })
    if (!validAssignee) {
      throw new Error('INVALID_ASSIGNEE')
    }
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { 
      title,
      importance,
      urgency,
      estimatedMinutes,
      startDate,
      dueDate,
      assigneeId,
    }
  })
  if (assigneeId && assigneeId !== previousAssigneeId) {
    await enqueueTaskAssignedEvent(taskId, assigneeId)
  }
  await syncTaskDeadlineEvents(taskId)
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

export async function updateProject(projectId: string, title: string, description: string, startDateStr?: string, dueDateStr?: string) {
  const authUser = await getCurrentUserOrThrow()
  await assertProjectAccess(projectId, authUser.id)

  const startDate = startDateStr ? new Date(startDateStr) : null
  const dueDate = dueDateStr ? new Date(dueDateStr) : null
  await prisma.project.update({
    where: { id: projectId },
    data: { title, description, startDate, dueDate }
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

export async function searchProjectShareCandidates(projectId: string, query: string) {
  const authUser = await getCurrentUserOrThrow()
  await assertProjectOwner(projectId, authUser.id)

  const normalizedQuery = query.trim()
  if (!normalizedQuery) {
    return { ok: true, candidates: [] as Array<{ id: string; email: string; name: string | null }> }
  }
  const terms = normalizedQuery.split(/\s+/).filter(Boolean)

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      userId: true,
      members: {
        select: { userId: true },
      },
    },
  })

  if (!project) {
    return { ok: false, candidates: [] as Array<{ id: string; email: string; name: string | null }> }
  }

  const excludedUserIds = [project.userId, ...project.members.map((member) => member.userId)]

  const candidates = await prisma.user.findMany({
    where: {
      id: { notIn: excludedUserIds },
      AND: terms.map((term) => ({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
        ],
      })),
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
    take: 10,
    orderBy: {
      createdAt: 'desc',
    },
  })

  return { ok: true, candidates }
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

export async function updateUserName(name: string) {
  const authUser = await getCurrentUserOrThrow()
  const normalized = name.trim()

  if (!normalized) {
    return { ok: false, message: 'ユーザーネームを入力してください。' }
  }

  await prisma.user.upsert({
    where: { id: authUser.id },
    update: { name: normalized },
    create: {
      id: authUser.id,
      email: authUser.email ?? '',
      name: normalized,
    },
  })

  const supabase = await createClient()
  await supabase.auth.updateUser({
    data: { name: normalized },
  })

  revalidatePath('/')
  return { ok: true, message: 'ユーザーネームを更新しました。' }
}
