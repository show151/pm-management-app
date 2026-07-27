'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUserOrThrow, assertTaskAccess } from '@/lib/project-access'

export async function reportBlocker(
  taskId: string,
  reason: string,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
) {
  const authUser = await getCurrentUserOrThrow()
  const task = await assertTaskAccess(taskId, authUser.id)

  if (!reason.trim()) {
    return { ok: false, message: 'ブロック理由を入力してください' }
  }

  // ブロッカーの作成
  await prisma.taskBlocker.create({
    data: {
      taskId,
      reason,
      severity,
    }
  })

  // タスクのステータスをBLOCKEDに変更し、blockedAtを更新
  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'BLOCKED',
      blockedAt: new Date(),
    }
  })

  revalidatePath('/')
  revalidatePath('/dashboard')
  revalidatePath(`/project/${task.projectId}`)

  return { ok: true }
}

export async function resolveBlocker(blockerId: string, taskId: string) {
  const authUser = await getCurrentUserOrThrow()
  const task = await assertTaskAccess(taskId, authUser.id)

  // ブロッカーの解決日時を更新
  await prisma.taskBlocker.update({
    where: { id: blockerId },
    data: { resolvedAt: new Date() }
  })

  // タスクに他の未解決ブロッカーがあるか確認
  const remainingBlockers = await prisma.taskBlocker.count({
    where: {
      taskId,
      resolvedAt: null
    }
  })

  // 他にブロッカーがなければ、ステータスをTODOに戻す（柔軟性を残すためIN_PROGRESSではなくTODOにする）
  if (remainingBlockers === 0) {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'TODO',
        blockedAt: null,
      }
    })
  }

  revalidatePath('/')
  revalidatePath('/dashboard')
  revalidatePath(`/project/${task.projectId}`)

  return { ok: true }
}
