'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const POLL_INTERVAL_MS = 10000
const MIN_REFRESH_GAP_MS = 4000

function isAutoRefreshTarget(pathname: string) {
  return pathname !== '/login' && pathname !== '/guest'
}

export default function LiveSyncRefresher() {
  const router = useRouter()
  const pathname = usePathname()
  const lastRefreshAtRef = useRef(0)

  useEffect(() => {
    if (!isAutoRefreshTarget(pathname)) return

    const refresh = () => {
      if (document.hidden || !navigator.onLine) return
      const now = Date.now()
      if (now - lastRefreshAtRef.current < MIN_REFRESH_GAP_MS) return
      lastRefreshAtRef.current = now
      router.refresh()
    }

    const intervalId = window.setInterval(refresh, POLL_INTERVAL_MS)
    const handleFocus = () => refresh()
    const handleVisibilityChange = () => refresh()

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [pathname, router])

  return null
}
