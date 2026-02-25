import { NextResponse } from 'next/server'
import { NotificationEventType, Prisma } from '@prisma/client'
import { enqueueNotificationEvent } from '@/lib/notifications'

type EnqueueBody = {
  userId?: string
  projectId?: string | null
  taskId?: string | null
  type?: NotificationEventType
  title?: string
  body?: string
  url?: string | null
  payload?: Record<string, unknown> | null
  scheduledAt?: string
  dedupeKey?: string
}

function isAuthorized(req: Request) {
  const secret = process.env.NOTIFICATION_CRON_SECRET
  if (!secret) return false
  return req.headers.get('x-notification-secret') === secret
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  let body: EnqueueBody
  try {
    body = (await req.json()) as EnqueueBody
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  if (
    !body.userId ||
    !body.type ||
    !body.title ||
    !body.body ||
    !body.scheduledAt ||
    !body.dedupeKey
  ) {
    return NextResponse.json({ error: 'INVALID_PAYLOAD' }, { status: 400 })
  }

  const scheduledAt = new Date(body.scheduledAt)
  if (Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: 'INVALID_SCHEDULED_AT' }, { status: 400 })
  }

  const event = await enqueueNotificationEvent({
    userId: body.userId,
    projectId: body.projectId ?? null,
    taskId: body.taskId ?? null,
    type: body.type,
    title: body.title,
    body: body.body,
    url: body.url ?? null,
    payload: (body.payload ?? undefined) as Prisma.InputJsonValue | undefined,
    scheduledAt,
    dedupeKey: body.dedupeKey,
  })

  return NextResponse.json({ eventId: event.id }, { status: 202 })
}
