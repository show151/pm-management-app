'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUserOrThrow, assertTaskAccess } from '@/lib/project-access'

export async function addDependency(predecessorId: string, dependentId: string) {
  const authUser = await getCurrentUserOrThrow()
  // Ensure user has access to both tasks
  const predecessorTask = await assertTaskAccess(predecessorId, authUser.id)
  const dependentTask = await assertTaskAccess(dependentId, authUser.id)
  
  if (predecessorTask.projectId !== dependentTask.projectId) {
    return { ok: false, message: '異なるプロジェクトのタスク間に依存関係は設定できません。' }
  }

  if (predecessorId === dependentId) {
    return { ok: false, message: '自分自身を先行タスクにはできません。' }
  }

  // Check for circular dependency
  // We need to fetch all dependencies for this project to do a proper DFS
  const allDependencies = await prisma.taskDependency.findMany({
    where: {
      predecessor: { projectId: predecessorTask.projectId }
    }
  })

  // Build adjacency list: from predecessor to dependent
  const graph = new Map<string, string[]>()
  for (const dep of allDependencies) {
    if (!graph.has(dep.predecessorId)) {
      graph.set(dep.predecessorId, [])
    }
    graph.get(dep.predecessorId)!.push(dep.dependentId)
  }

  // Check if an edge from predecessorId -> dependentId already exists
  if (graph.get(predecessorId)?.includes(dependentId)) {
    return { ok: false, message: 'すでに依存関係が設定されています。' }
  }

  // We want to add an edge from predecessorId -> dependentId
  // If dependentId can reach predecessorId, then adding this edge creates a cycle
  function hasPath(start: string, target: string, visited = new Set<string>()): boolean {
    if (start === target) return true
    if (visited.has(start)) return false
    visited.add(start)
    const neighbors = graph.get(start) || []
    for (const neighbor of neighbors) {
      if (hasPath(neighbor, target, visited)) return true
    }
    return false
  }

  if (hasPath(dependentId, predecessorId)) {
    return { ok: false, message: '循環依存（ループ）が発生するため追加できません。' }
  }

  await prisma.taskDependency.create({
    data: {
      predecessorId,
      dependentId,
    }
  })
  
  revalidatePath(`/project/${predecessorTask.projectId}`)
  return { ok: true, message: '先行タスクを追加しました。' }
}

export async function removeDependency(predecessorId: string, dependentId: string) {
  const authUser = await getCurrentUserOrThrow()
  const task = await assertTaskAccess(predecessorId, authUser.id)

  await prisma.taskDependency.deleteMany({
    where: { predecessorId, dependentId }
  })
  revalidatePath(`/project/${task.projectId}`)
  return { ok: true, message: '依存関係を削除しました。' }
}
