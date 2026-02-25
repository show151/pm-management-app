import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { deactivateNotificationSubscription, upsertNotificationSubscription } from '@/lib/notifications'
import { prisma } from '@/lib/prisma'

type SubscriptionBody = {
  endpoint?: string
  keys?: {
    p256dh?: string
    auth?: string
  }
  platform?: string
  userAgent?: string
  locale?: string
}

async function getAuthUser() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return data.user
}

export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body: SubscriptionBody
  try {
    body = (await req.json()) as SubscriptionBody
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  const endpoint = body.endpoint?.trim()
  const p256dh = body.keys?.p256dh?.trim()
  const auth = body.keys?.auth?.trim()

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'INVALID_PAYLOAD' }, { status: 400 })
  }

  try {
    const subscription = await upsertNotificationSubscription({
      authUser: { id: user.id, email: user.email },
      endpoint,
      p256dh,
      auth,
      platform: body.platform ?? null,
      userAgent: body.userAgent ?? req.headers.get('user-agent'),
      locale: body.locale ?? null,
    })
    return NextResponse.json({ subscriptionId: subscription.id }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SUBSCRIPTION_UPSERT_FAILED'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const subscriptions = await prisma.notificationSubscription.findMany({
    where: {
      userId: user.id,
      isActive: true,
    },
    select: {
      endpoint: true,
      platform: true,
      createdAt: true,
      lastSeenAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return NextResponse.json({
    subscribed: subscriptions.length > 0,
    subscriptions,
  })
}

export async function DELETE(req: Request) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body: { endpoint?: string }
  try {
    body = (await req.json()) as { endpoint?: string }
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  const endpoint = body.endpoint?.trim()
  if (!endpoint) {
    return NextResponse.json({ error: 'INVALID_PAYLOAD' }, { status: 400 })
  }

  await deactivateNotificationSubscription(user.id, endpoint)
  return new NextResponse(null, { status: 204 })
}
