'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0))
}

type Status = 'loading' | 'unsupported' | 'denied' | 'inactive' | 'active' | 'error'

export default function PushNotificationManager() {
  const [status, setStatus] = useState<Status>('loading')
  const [working, setWorking] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }

    const permission = Notification.permission
    if (permission === 'denied') {
      setStatus('denied')
      return
    }

    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        setSubscription(sub)
        setStatus('active')
      } else {
        setStatus('inactive')
      }
    } catch {
      setStatus('error')
    }
  }

  const enable = async () => {
    setWorking(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('denied')
        return
      }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      })

      const key = sub.getKey('p256dh')
      const auth = sub.getKey('auth')

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: key ? btoa(String.fromCharCode(...Array.from(new Uint8Array(key)))) : '',
          auth: auth ? btoa(String.fromCharCode(...Array.from(new Uint8Array(auth)))) : '',
        }),
      })

      if (!res.ok) throw new Error('Errore salvataggio subscription')

      setSubscription(sub)
      setStatus('active')
    } catch (err) {
      console.error(err)
      setStatus('error')
    } finally {
      setWorking(false)
    }
  }

  const disable = async () => {
    if (!subscription) return
    setWorking(true)
    try {
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      })
      await subscription.unsubscribe()
      setSubscription(null)
      setStatus('inactive')
    } catch (err) {
      console.error(err)
      setStatus('error')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
          status === 'active' ? 'bg-green-100' : 'bg-gray-100'
        }`}>
          {status === 'active'
            ? <Bell className="h-5 w-5 text-green-600" />
            : <BellOff className="h-5 w-5 text-gray-400" />
          }
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">Notifiche Push</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {status === 'loading'    && 'Controllo stato...'}
            {status === 'unsupported'&& 'Non supportate da questo browser'}
            {status === 'denied'     && 'Bloccate — riabilita dalle impostazioni del browser'}
            {status === 'inactive'   && 'Disattivate su questo dispositivo'}
            {status === 'active'     && 'Attive su questo dispositivo'}
            {status === 'error'      && 'Errore — riprova'}
          </p>
        </div>
      </div>

      <div className="shrink-0">
        {status === 'loading' && (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        )}

        {status === 'active' && (
          <button
            onClick={disable}
            disabled={working}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {working ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Disattiva'}
          </button>
        )}

        {(status === 'inactive' || status === 'error') && (
          <button
            onClick={enable}
            disabled={working}
            className="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {working ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Attiva'}
          </button>
        )}

        {status === 'unsupported' && (
          <AlertCircle className="h-5 w-5 text-gray-400" />
        )}

        {status === 'denied' && (
          <AlertCircle className="h-5 w-5 text-orange-500" />
        )}
      </div>
    </div>
  )
}
