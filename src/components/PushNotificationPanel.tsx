'use client'

import { useEffect, useMemo, useState } from 'react'

type SubscriptionStatus = {
  subscribed: boolean
}

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
  const [message, setMessage] = useState('')

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
        const response = await fetch('/api/notifications/subscriptions', { method: 'GET' })
        if (!mounted || !response.ok) return
        const data = (await response.json()) as SubscriptionStatus
        setSubscribed(Boolean(data.subscribed))
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
      {message && <p className="text-xs text-sky-200">{message}</p>}
    </section>
  )
}
