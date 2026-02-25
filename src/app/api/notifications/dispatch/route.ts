import { NextResponse } from 'next/server'
import { dispatchPendingNotifications } from '@/lib/notifications'

function isAuthorized(req: Request) {
  const secret = process.env.NOTIFICATION_CRON_SECRET
  if (!secret) return false
  const xHeader = req.headers.get('x-notification-secret')
  const auth = req.headers.get('authorization')
  const bearer = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null
  return xHeader === secret || bearer === secret
}

async function runDispatch(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  let limit = 100
  const url = new URL(req.url)
  const rawLimit = url.searchParams.get('limit')
  if (rawLimit) {
    const parsed = Number(rawLimit)
    if (!Number.isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, 500)
    }
  }

  const result = await dispatchPendingNotifications(limit)
  return NextResponse.json(result)
}

export async function POST(req: Request) {
  return runDispatch(req)
}

export async function GET(req: Request) {
  return runDispatch(req)
}
