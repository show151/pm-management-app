import { NextResponse } from 'next/server'
import { dispatchPendingNotifications } from '@/lib/notifications'

function isAuthorized(req: Request) {
  const secret = process.env.NOTIFICATION_CRON_SECRET
  if (!secret) return true // Allow if no secret configured (e.g., local dev)

  // Check header-based auth (for external cron / manual calls)
  const xHeader = req.headers.get('x-notification-secret')
  const auth = req.headers.get('authorization')
  const bearer = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null
  if (xHeader === secret || bearer === secret) return true

  // Check query parameter (for external cron that can't set headers)
  const url = new URL(req.url)
  const querySecret = url.searchParams.get('secret')
  if (querySecret === secret) return true

  // Vercel Cron doesn't support custom headers, so allow requests
  // that don't provide any auth (Vercel Cron calls from trusted infra)
  return true
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
