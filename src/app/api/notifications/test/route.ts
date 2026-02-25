import { NextResponse } from 'next/server'
import { NotificationEventType } from '@prisma/client'
import { createClient } from '@/utils/supabase/server'
import { enqueueNotificationEvent } from '@/lib/notifications'

async function getAuthUser() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return data.user
}

export async function POST() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const now = new Date()
  const event = await enqueueNotificationEvent({
    userId: user.id,
    type: NotificationEventType.TEST,
    title: '通知テスト',
    body: 'テスト通知を送信しました。',
    url: '/',
    payload: { kind: 'test' },
    scheduledAt: now,
    dedupeKey: `test:${user.id}:${Math.floor(now.getTime() / 1000)}`,
  })

  return NextResponse.json({ eventId: event.id }, { status: 202 })
}
