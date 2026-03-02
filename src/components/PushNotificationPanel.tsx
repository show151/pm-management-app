'use client'

import { useEffect, useMemo, useState } from 'react'

type SubscriptionStatus = {
  subscribed: boolean
}

type NotificationPreference = {
  timezone: string
  quietHoursStart: number | null
  quietHoursEnd: number | null
  pushEnabled: boolean
  dueSoonEnabled: boolean
  overdueEnabled: boolean
  assignmentEnabled: boolean
}

const DEFAULT_PREFERENCE: NotificationPreference = {
  timezone: 'Asia/Tokyo',
  quietHoursStart: null,
  quietHoursEnd: null,
  pushEnabled: true,
  dueSoonEnabled: true,
  overdueEnabled: true,
  assignmentEnabled: true,
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i)

function detectPlatform() {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  const displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches
  return iosStandalone || displayModeStandalone
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64(buffer: ArrayBuffer | null) {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

export default function PushNotificationPanel() {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<'default' | 'denied' | 'granted'>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [isSavingPreference, setIsSavingPreference] = useState(false)
  const [message, setMessage] = useState('')
  const [preference, setPreference] = useState<NotificationPreference>(DEFAULT_PREFERENCE)

  const platform = useMemo(() => detectPlatform(), [])
  const iosNeedsInstallGuide = platform === 'ios' && !isStandaloneMode()
  const vapidPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    setIsSupported(supported)
    if (supported) {
      setPermission(Notification.permission)
    }
  }, [])

  useEffect(() => {
    if (!isSupported) return

    let mounted = true
    async function init() {
      try {
        await navigator.serviceWorker.register('/sw.js')
        const [subscriptionRes, preferenceRes] = await Promise.all([
          fetch('/api/notifications/subscriptions', { method: 'GET' }),
          fetch('/api/notifications/preferences', { method: 'GET' }),
        ])

        if (!mounted) return
        if (subscriptionRes.ok) {
          const data = (await subscriptionRes.json()) as SubscriptionStatus
          setSubscribed(Boolean(data.subscribed))
        }
        if (preferenceRes.ok) {
          const data = (await preferenceRes.json()) as Partial<NotificationPreference>
          setPreference({
            timezone: typeof data.timezone === 'string' ? data.timezone : DEFAULT_PREFERENCE.timezone,
            quietHoursStart:
              typeof data.quietHoursStart === 'number' ? data.quietHoursStart : DEFAULT_PREFERENCE.quietHoursStart,
            quietHoursEnd:
              typeof data.quietHoursEnd === 'number' ? data.quietHoursEnd : DEFAULT_PREFERENCE.quietHoursEnd,
            pushEnabled: Boolean(data.pushEnabled ?? DEFAULT_PREFERENCE.pushEnabled),
            dueSoonEnabled: Boolean(data.dueSoonEnabled ?? DEFAULT_PREFERENCE.dueSoonEnabled),
            overdueEnabled: Boolean(data.overdueEnabled ?? DEFAULT_PREFERENCE.overdueEnabled),
            assignmentEnabled: Boolean(data.assignmentEnabled ?? DEFAULT_PREFERENCE.assignmentEnabled),
          })
        }
      } catch {
        if (mounted) {
          setMessage('通知機能の初期化に失敗しました。')
        }
      }
    }
    void init()

    return () => {
      mounted = false
    }
  }, [isSupported])

  const handleSubscribe = async () => {
    if (!isSupported || !vapidPublicKey) {
      setMessage('通知設定に必要な環境変数が不足しています。')
      return
    }
    if (iosNeedsInstallGuide) {
      setMessage('iOSはホーム画面に追加したPWAで通知を有効化できます。')
      return
    }

    setIsBusy(true)
    setMessage('')
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') {
        setMessage('通知が許可されていません。ブラウザ設定を確認してください。')
        return
      }

      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        })
      }

      const keyP256dh = arrayBufferToBase64(subscription.getKey('p256dh'))
      const keyAuth = arrayBufferToBase64(subscription.getKey('auth'))
      const response = await fetch('/api/notifications/subscriptions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: { p256dh: keyP256dh, auth: keyAuth },
          platform,
          userAgent: navigator.userAgent,
          locale: navigator.language,
        }),
      })

      if (!response.ok) {
        throw new Error('SUBSCRIBE_FAILED')
      }

      setSubscribed(true)
      setMessage('通知を有効化しました。')
    } catch {
      setMessage('通知の有効化に失敗しました。')
    } finally {
      setIsBusy(false)
    }
  }

  const handleUnsubscribe = async () => {
    if (!isSupported) return
    setIsBusy(true)
    setMessage('')
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await fetch('/api/notifications/subscriptions', {
          method: 'DELETE',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        })
        await subscription.unsubscribe()
      }
      setSubscribed(false)
      setMessage('通知をオフにしました。')
    } catch {
      setMessage('通知の停止に失敗しました。')
    } finally {
      setIsBusy(false)
    }
  }

  const handleQueueTest = async () => {
    setIsBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/notifications/test', { method: 'POST' })
      if (!response.ok) {
        throw new Error('TEST_FAILED')
      }
      setMessage('テスト通知をキューに登録しました。配信ジョブで送信されます。')
    } catch {
      setMessage('テスト通知の登録に失敗しました。')
    } finally {
      setIsBusy(false)
    }
  }

  const handleSavePreference = async () => {
    setIsSavingPreference(true)
    setMessage('')
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || preference.timezone || 'UTC'
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          timezone,
          quietHoursStart: preference.quietHoursStart,
          quietHoursEnd: preference.quietHoursEnd,
          pushEnabled: preference.pushEnabled,
          dueSoonEnabled: preference.dueSoonEnabled,
          overdueEnabled: preference.overdueEnabled,
          assignmentEnabled: preference.assignmentEnabled,
        }),
      })

      if (!response.ok) {
        throw new Error('PREFERENCE_SAVE_FAILED')
      }
      setPreference((prev) => ({ ...prev, timezone }))
      setMessage('通知設定を保存しました。')
    } catch {
      setMessage('通知設定の保存に失敗しました。')
    } finally {
      setIsSavingPreference(false)
    }
  }

  if (!isSupported) {
    return (
      <section className="ui-panel rounded-xl p-3 sm:p-4">
        <p className="text-sm text-gray-300">この端末/ブラウザはWeb Push通知に未対応です。</p>
      </section>
    )
  }

  return (
    <section className="ui-panel rounded-xl p-3 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">通知設定（Web Push）</h3>
        <span className="text-xs text-gray-300">権限: {permission}</span>
      </div>

      {iosNeedsInstallGuide && (
        <p className="text-xs text-amber-200 bg-amber-900/35 border border-amber-500/40 rounded-md px-3 py-2">
          iOSはSafariで「共有」→「ホーム画面に追加」後、アプリ起動状態で通知を有効化してください。
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSubscribe}
          disabled={isBusy || subscribed}
          className="btn btn-primary"
        >
          通知を有効化
        </button>
        <button
          type="button"
          onClick={handleUnsubscribe}
          disabled={isBusy || !subscribed}
          className="btn btn-secondary"
        >
          通知を停止
        </button>
        <button
          type="button"
          onClick={handleQueueTest}
          disabled={isBusy}
          className="btn btn-secondary"
        >
          テスト通知を登録
        </button>
      </div>

      <p className="text-xs text-gray-300">
        通知内容: 1週間前 / 1日前 / 30分前 / 期限超過
      </p>

      <div className="space-y-2 rounded-lg border border-white/10 bg-black/15 p-3">
        <p className="text-xs font-semibold text-gray-200">通知詳細設定</p>
        <label className="flex items-center gap-2 text-xs text-gray-100">
          <input
            type="checkbox"
            checked={preference.pushEnabled}
            onChange={(e) => setPreference((prev) => ({ ...prev, pushEnabled: e.target.checked }))}
          />
          Push通知を有効化
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-100">
          <input
            type="checkbox"
            checked={preference.dueSoonEnabled}
            onChange={(e) => setPreference((prev) => ({ ...prev, dueSoonEnabled: e.target.checked }))}
          />
          期限前通知（1週間/1日/30分）
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-100">
          <input
            type="checkbox"
            checked={preference.overdueEnabled}
            onChange={(e) => setPreference((prev) => ({ ...prev, overdueEnabled: e.target.checked }))}
          />
          期限超過通知
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-100">
          <input
            type="checkbox"
            checked={preference.assignmentEnabled}
            onChange={(e) => setPreference((prev) => ({ ...prev, assignmentEnabled: e.target.checked }))}
          />
          アサイン通知
        </label>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-100">
          <span>静音時間</span>
          <select
            className="bg-black/30 border border-white/15 rounded px-2 py-1"
            value={preference.quietHoursStart ?? ''}
            onChange={(e) =>
              setPreference((prev) => ({
                ...prev,
                quietHoursStart: e.target.value === '' ? null : Number(e.target.value),
              }))
            }
          >
            <option value="">未設定</option>
            {HOUR_OPTIONS.map((hour) => (
              <option key={`start-${hour}`} value={hour}>
                {String(hour).padStart(2, '0')}:00
              </option>
            ))}
          </select>
          <span>〜</span>
          <select
            className="bg-black/30 border border-white/15 rounded px-2 py-1"
            value={preference.quietHoursEnd ?? ''}
            onChange={(e) =>
              setPreference((prev) => ({
                ...prev,
                quietHoursEnd: e.target.value === '' ? null : Number(e.target.value),
              }))
            }
          >
            <option value="">未設定</option>
            {HOUR_OPTIONS.map((hour) => (
              <option key={`end-${hour}`} value={hour}>
                {String(hour).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleSavePreference}
          disabled={isSavingPreference || isBusy}
          className="btn btn-secondary"
        >
          {isSavingPreference ? '保存中...' : '通知設定を保存'}
        </button>
      </div>
      {message && <p className="text-xs text-sky-200">{message}</p>}
    </section>
  )
}
