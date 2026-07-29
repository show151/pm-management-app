import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-session'
import { assertProjectAccess } from '@/lib/project-access'

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const projectId = params.id
  
  const user = await getAuthUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await assertProjectAccess(projectId, user.id)
  } catch (err) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: {
        include: {
          assignee: true,
          children: {
            include: { assignee: true }
          }
        },
        where: { parentId: null }
      }
    }
  })

  if (!project) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  const allTasks: any[] = []
  project.tasks.forEach(task => {
    allTasks.push(task)
    if (task.children) {
      allTasks.push(...task.children)
    }
  })

  const escapeCsv = (str: string | null | undefined) => {
    if (str == null) return '""'
    const escaped = String(str).replace(/"/g, '""')
    return `"${escaped}"`
  }

  const header = ['ID', 'Task Name', 'Status', 'Assignee', 'Due Date', 'Estimated Minutes', 'Actual Minutes', 'Confidence Score', 'Satisfaction', 'Reflection']
  
  const rows = allTasks.map(task => {
    return [
      escapeCsv(task.id),
      escapeCsv(task.title),
      escapeCsv(task.status),
      escapeCsv(task.assignee?.name || task.assignee?.email || ''),
      escapeCsv(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''),
      escapeCsv(task.estimatedMinutes?.toString() || ''),
      escapeCsv(task.actualMinutes?.toString() || ''),
      escapeCsv(task.confidenceScore?.toString() || ''),
      escapeCsv(task.satisfaction?.toString() || ''),
      escapeCsv(task.reflection || '')
    ].join(',')
  })

  const csvContent = [header.join(','), ...rows].join('\n')
  
  // Add UTF-8 BOM
  const bom = '\uFEFF'
  
  return new NextResponse(bom + csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="project_${projectId}_tasks.csv"`,
    }
  })
}
