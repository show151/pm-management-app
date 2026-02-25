import {
  NotificationEventStatus,
  NotificationEventType,
  NotificationDeliveryStatus,
  type Prisma,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'

const DUE_SOON_OFFSETS = [
  { key: '1w', label: '1週間後', ms: 7 * 24 * 60 * 60 * 1000 },
  { key: '1d', label: '1日後', ms: 24 * 60 * 60 * 1000 },
  { key: '30m', label: '30分後', ms: 30 * 60 * 1000 },
] as const
const OVERDUE_OFFSET_MS = 60 * 1000
const QUIET_RESCHEDULE_MS = 15 * 60 * 1000

type AuthUserLike = {
  id: string
  email?: string | null
}

type EnqueueInput = {
  userId: string
  projectId?: string | null
  taskId?: string | null
  type: NotificationEventType
  title: string
  body: string
  url?: string | null
  payload?: Prisma.InputJsonValue
  scheduledAt: Date
  dedupeKey: string
}

function formatDateTimeJa(value: Date) {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}

function nextAvailableByQuietHours(now: Date, startHour?: number | null, endHour?: number | null) {
  if (startHour === null || startHour === undefined || endHour === null || endHour === undefined) {
    return null
  }
  const hour = now.getHours()
  const wraps = startHour > endHour
  const inQuiet = wraps
    ? hour >= startHour || hour < endHour
    : hour >= startHour && hour < endHour

  if (!inQuiet) return null

  const next = new Date(now)
  next.setMinutes(0, 0, 0)
  if (wraps) {
    if (hour >= startHour) {
      next.setDate(next.getDate() + 1)
    }
    next.setHours(endHour)
  } else {
    next.setHours(endHour)
  }
  return next
}

function canDeliverByPreference(
  type: NotificationEventType,
  preference: {
    pushEnabled: boolean
    dueSoonEnabled: boolean
    overdueEnabled: boolean
    assignmentEnabled: boolean
  }
) {
  if (!preference.pushEnabled) return false
  if (type === 'TASK_DUE_SOON') return preference.dueSoonEnabled
  if (type === 'TASK_OVERDUE') return preference.overdueEnabled
  if (type === 'TASK_ASSIGNED') return preference.assignmentEnabled
  return true
}

async function getWebPushModule(): Promise<{
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void
  sendNotification: (
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
    options?: { TTL?: number }
  ) => Promise<unknown>
}> {
  try {
    const mod = await (0, eval)('import("web-push")')
    return mod.default ?? mod
  } catch {
    throw new Error('WEB_PUSH_LIB_MISSING')
  }
}

async function sendWebPushNotification(input: {
  endpoint: string
  p256dh: string
  auth: string
  payload: Record<string, unknown>
}) {
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY
  const subject = process.env.WEB_PUSH_SUBJECT ?? 'mailto:admin@example.com'

  if (!publicKey || !privateKey) {
    throw new Error('VAPID_NOT_CONFIGURED')
  }

  const webPush = await getWebPushModule()
  webPush.setVapidDetails(subject, publicKey, privateKey)
  await webPush.sendNotification(
    {
      endpoint: input.endpoint,
      keys: {
        p256dh: input.p256dh,
        auth: input.auth,
      },
    },
    JSON.stringify(input.payload),
    { TTL: 60 }
  )
}

export async function ensureUserRow(authUser: AuthUserLike) {
  if (!authUser.email) {
    const existing = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true },
    })
    if (!existing) {
      throw new Error('USER_EMAIL_REQUIRED')
    }
    return
  }

  await prisma.user.upsert({
    where: { id: authUser.id },
    update: {
      email: authUser.email,
    },
    create: {
      id: authUser.id,
      email: authUser.email,
      name: authUser.email.split('@')[0] || null,
    },
  })
}

export async function upsertNotificationSubscription(input: {
  authUser: AuthUserLike
  endpoint: string
  p256dh: string
  auth: string
  platform?: string | null
  userAgent?: string | null
  locale?: string | null
}) {
  await ensureUserRow(input.authUser)

  return prisma.notificationSubscription.upsert({
    where: { endpoint: input.endpoint },
    update: {
      userId: input.authUser.id,
      p256dh: input.p256dh,
      auth: input.auth,
      platform: input.platform ?? null,
      userAgent: input.userAgent ?? null,
      locale: input.locale ?? null,
      isActive: true,
      lastSeenAt: new Date(),
    },
    create: {
      userId: input.authUser.id,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      platform: input.platform ?? null,
      userAgent: input.userAgent ?? null,
      locale: input.locale ?? null,
      isActive: true,
      lastSeenAt: new Date(),
    },
    select: { id: true },
  })
}

export async function deactivateNotificationSubscription(authUserId: string, endpoint: string) {
  await prisma.notificationSubscription.updateMany({
    where: {
      userId: authUserId,
      endpoint,
    },
    data: {
      isActive: false,
    },
  })
}

export async function getOrCreateNotificationPreference(authUser: AuthUserLike) {
  await ensureUserRow(authUser)
  return prisma.notificationPreference.upsert({
    where: { userId: authUser.id },
    update: {},
    create: {
      userId: authUser.id,
    },
  })
}

export async function updateNotificationPreference(input: {
  authUser: AuthUserLike
  timezone?: string
  quietHoursStart?: number | null
  quietHoursEnd?: number | null
  pushEnabled?: boolean
  dueSoonEnabled?: boolean
  overdueEnabled?: boolean
  assignmentEnabled?: boolean
}) {
  await ensureUserRow(input.authUser)
  await getOrCreateNotificationPreference(input.authUser)

  return prisma.notificationPreference.update({
    where: { userId: input.authUser.id },
    data: {
      timezone: input.timezone,
      quietHoursStart: input.quietHoursStart,
      quietHoursEnd: input.quietHoursEnd,
      pushEnabled: input.pushEnabled,
      dueSoonEnabled: input.dueSoonEnabled,
      overdueEnabled: input.overdueEnabled,
      assignmentEnabled: input.assignmentEnabled,
    },
  })
}

export async function enqueueNotificationEvent(input: EnqueueInput) {
  return prisma.notificationEvent.upsert({
    where: { dedupeKey: input.dedupeKey },
    update: {
      status: NotificationEventStatus.PENDING,
      scheduledAt: input.scheduledAt,
      title: input.title,
      body: input.body,
      url: input.url ?? null,
      payload: input.payload,
    },
    create: {
      userId: input.userId,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      url: input.url ?? null,
      payload: input.payload,
      scheduledAt: input.scheduledAt,
      dedupeKey: input.dedupeKey,
    },
    select: { id: true },
  })
}

export async function cancelPendingTaskNotifications(taskId: string) {
  await prisma.notificationEvent.updateMany({
    where: {
      taskId,
      status: NotificationEventStatus.PENDING,
    },
    data: {
      status: NotificationEventStatus.CANCELED,
    },
  })
}

export async function syncTaskDeadlineEvents(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      status: true,
      dueDate: true,
      projectId: true,
      project: {
        select: {
          userId: true,
          members: {
            select: { userId: true },
          },
        },
      },
    },
  })

  if (!task) {
    return
  }

  await prisma.notificationEvent.updateMany({
    where: {
      taskId,
      type: {
        in: [NotificationEventType.TASK_DUE_SOON, NotificationEventType.TASK_OVERDUE],
      },
      status: NotificationEventStatus.PENDING,
    },
    data: {
      status: NotificationEventStatus.CANCELED,
    },
  })

  if (!task.dueDate || task.status === 'DONE') {
    return
  }

  const recipientIds = new Set<string>([task.project.userId, ...task.project.members.map((member) => member.userId)])
  const overdueAt = new Date(task.dueDate.getTime() + OVERDUE_OFFSET_MS)
  const dueLabel = formatDateTimeJa(task.dueDate)
  const url = `/project/${task.projectId}`

  for (const userId of recipientIds) {
    for (const offset of DUE_SOON_OFFSETS) {
      const scheduledAt = new Date(Math.max(task.dueDate.getTime() - offset.ms, Date.now()))
      await enqueueNotificationEvent({
        userId,
        projectId: task.projectId,
        taskId: task.id,
        type: NotificationEventType.TASK_DUE_SOON,
        title: '期限が近づいています',
        body: `「${task.title}」の期限は ${dueLabel} です（あと${offset.label}）。`,
        url,
        payload: {
          taskId: task.id,
          projectId: task.projectId,
          reminder: offset.key,
        },
        scheduledAt,
        dedupeKey: `task_due_soon:${offset.key}:${userId}:${task.id}:${task.dueDate.toISOString()}`,
      })
    }

    await enqueueNotificationEvent({
      userId,
      projectId: task.projectId,
      taskId: task.id,
      type: NotificationEventType.TASK_OVERDUE,
      title: 'タスクが期限超過です',
      body: `「${task.title}」が期限超過になりました。`,
      url,
      payload: {
        taskId: task.id,
        projectId: task.projectId,
      },
      scheduledAt: overdueAt,
      dedupeKey: `task_overdue:${userId}:${task.id}:${task.dueDate.toISOString()}`,
    })
  }
}

export async function dispatchPendingNotifications(limit = 100) {
  const now = new Date()
  const pendingEvents = await prisma.notificationEvent.findMany({
    where: {
      status: NotificationEventStatus.PENDING,
      scheduledAt: { lte: now },
    },
    orderBy: {
      scheduledAt: 'asc',
    },
    take: limit,
    include: {
      user: {
        select: {
          notificationPreference: true,
          notificationSubscriptions: {
            where: { isActive: true },
            select: {
              id: true,
              endpoint: true,
              p256dh: true,
              auth: true,
            },
          },
        },
      },
    },
  })

  let sent = 0
  let failed = 0
  let rescheduled = 0
  let canceled = 0

  for (const event of pendingEvents) {
    const pref =
      event.user.notificationPreference ??
      (await prisma.notificationPreference.create({
        data: { userId: event.userId },
      }))

    if (!canDeliverByPreference(event.type, pref)) {
      await prisma.notificationEvent.update({
        where: { id: event.id },
        data: { status: NotificationEventStatus.CANCELED },
      })
      canceled += 1
      continue
    }

    const nextAllowed = nextAvailableByQuietHours(new Date(), pref.quietHoursStart, pref.quietHoursEnd)
    if (nextAllowed) {
      await prisma.notificationEvent.update({
        where: { id: event.id },
        data: {
          scheduledAt: new Date(Math.max(nextAllowed.getTime(), Date.now() + QUIET_RESCHEDULE_MS)),
        },
      })
      rescheduled += 1
      continue
    }

    const activeSubscriptions = event.user.notificationSubscriptions
    if (activeSubscriptions.length === 0) {
      await prisma.notificationEvent.update({
        where: { id: event.id },
        data: { status: NotificationEventStatus.FAILED },
      })
      failed += 1
      continue
    }

    let eventHasSuccess = false

    for (const subscription of activeSubscriptions) {
      try {
        await sendWebPushNotification({
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
          payload: {
            title: event.title,
            body: event.body,
            url: event.url ?? '/',
            eventId: event.id,
            type: event.type,
            payload: event.payload,
          },
        })

        eventHasSuccess = true
        await prisma.notificationDelivery.create({
          data: {
            eventId: event.id,
            subscriptionId: subscription.id,
            status: NotificationDeliveryStatus.SENT,
            sentAt: new Date(),
            attempt: 1,
          },
        })
      } catch (error) {
        const statusCode =
          typeof error === 'object' && error !== null && 'statusCode' in error
            ? Number((error as { statusCode: number }).statusCode)
            : null
        const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'

        await prisma.notificationDelivery.create({
          data: {
            eventId: event.id,
            subscriptionId: subscription.id,
            status: NotificationDeliveryStatus.FAILED,
            statusCode,
            errorCode: message,
            errorMessage: message.slice(0, 500),
            attempt: 1,
          },
        })

        if (statusCode === 404 || statusCode === 410) {
          await prisma.notificationSubscription.update({
            where: { id: subscription.id },
            data: { isActive: false },
          })
        }
      }
    }

    if (eventHasSuccess) {
      await prisma.notificationEvent.update({
        where: { id: event.id },
        data: {
          status: NotificationEventStatus.SENT,
          sentAt: new Date(),
        },
      })
      sent += 1
    } else {
      await prisma.notificationEvent.update({
        where: { id: event.id },
        data: { status: NotificationEventStatus.FAILED },
      })
      failed += 1
    }
  }

  return {
    processed: pendingEvents.length,
    sent,
    failed,
    rescheduled,
    canceled,
  }
}
