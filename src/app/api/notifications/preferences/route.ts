import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-session'
import { getOrCreateNotificationPreference, updateNotificationPreference } from '@/lib/notifications'

type PreferenceBody = {
  timezone?: string
  quietHoursStart?: number | null
  quietHoursEnd?: number | null
  pushEnabled?: boolean
  dueSoonEnabled?: boolean
  overdueEnabled?: boolean
  assignmentEnabled?: boolean
  slackWebhookUrl?: string | null
  slackEnabled?: boolean
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const preference = await getOrCreateNotificationPreference({
    id: user.id,
    email: user.email,
  })
  return NextResponse.json(preference)
}

export async function PUT(req: Request) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body: PreferenceBody
  try {
    body = (await req.json()) as PreferenceBody
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  const next = await updateNotificationPreference({
    authUser: {
      id: user.id,
      email: user.email,
    },
    timezone: body.timezone,
    quietHoursStart: body.quietHoursStart,
    quietHoursEnd: body.quietHoursEnd,
    pushEnabled: body.pushEnabled,
    dueSoonEnabled: body.dueSoonEnabled,
    overdueEnabled: body.overdueEnabled,
    assignmentEnabled: body.assignmentEnabled,
    slackWebhookUrl: body.slackWebhookUrl,
    slackEnabled: body.slackEnabled,
  })

  return NextResponse.json(next)
}
