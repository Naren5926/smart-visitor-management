import { useCallback, useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '@/auth/authContext'
import { apiFetch } from '@/api'
import { Alert } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'

// The rotating QR students scan to prove they reached this teacher. It changes every 30 seconds,
// so a screenshot sent to someone else stops working almost immediately.
export default function TeacherQr() {
  const { token } = useAuth()
  const [live, setLive] = useState(null)
  const [error, setError] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(0)

  const load = useCallback(() => {
    apiFetch('/api/teacher/live-code', { token })
      .then((d) => {
        setLive(d)
        setSecondsLeft(d.expiresIn)
        setError('')
      })
      .catch((err) => setError(err.message))
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  // Tick every second; ask the server for the next code the moment this one runs out.
  useEffect(() => {
    if (!live) return
    const timeout = setTimeout(load, live.expiresIn * 1000 + 100)
    const tick = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => {
      clearTimeout(timeout)
      clearInterval(tick)
    }
  }, [live, load])

  // Also refresh when returning to the app from the background.
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">My QR</h1>
        <p className="text-sm text-muted-foreground">Let the student scan this when they reach you. It refreshes by itself.</p>
      </div>

      {error && <Alert>{error}</Alert>}

      {live && (
        <Card className="items-center gap-4 px-4 py-6 text-center">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <QRCodeSVG value={live.code} size={288} level="M" className="h-auto w-full max-w-[min(75vw,320px)]" />
          </div>
          <div className="w-full max-w-xs space-y-1">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width] duration-1000 ease-linear"
                style={{ width: `${(secondsLeft / 30) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground tabular-nums">New code in {secondsLeft}s</p>
          </div>
        </Card>
      )}
    </div>
  )
}
