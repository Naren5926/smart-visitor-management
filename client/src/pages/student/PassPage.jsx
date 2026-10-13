import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowLeft, CheckCircle2, ScanLine } from 'lucide-react'
import { useAuth } from '@/auth/authContext'
import { apiFetch } from '@/api'
import CountdownRing from '@/components/CountdownRing'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatClock, usePolling, useSecondsLeft } from '@/lib/hooks'
import { purposeLabel } from '@/lib/visits'

export default function PassPage() {
  const { id } = useParams()
  const { token } = useAuth()
  const [pass, setPass] = useState(null)
  const [visit, setVisit] = useState(null)
  const [error, setError] = useState('')
  const left = useSecondsLeft(pass?.expiresAt, pass?.serverTime)

  const loadPass = useCallback(() => {
    apiFetch(`/api/visits/${id}/pass`, { token })
      .then((p) => {
        setPass(p)
        setError('')
      })
      .catch((err) => {
        setPass(null)
        setError(err.message)
      })
  }, [id, token])

  // Watch the visit so the screen switches by itself when security scans the entry QR.
  const status = visit?.status
  usePolling(
    () =>
      apiFetch('/api/visits/mine', { token })
        .then((d) => setVisit(d.visits.find((v) => v.id === id) ?? null))
        .catch(() => {}),
    3000
  )

  useEffect(() => {
    if (status !== 'completed') loadPass()
  }, [status, loadPass])

  // An exit QR is re-issued when it is about to run out, so it never shows an expired code.
  useEffect(() => {
    if (pass?.type === 'exit' && left === 0) loadPass()
  }, [pass?.type, left, loadPass])

  const back = (
    <Button asChild variant="ghost" size="sm" className="-ml-2">
      <Link to="/student">
        <ArrowLeft /> Back
      </Link>
    </Button>
  )

  if (status === 'completed') {
    return (
      <div className="space-y-4">
        {back}
        <Card className="items-center gap-2 py-10 text-center">
          <CheckCircle2 className="size-12 text-emerald-500" />
          <h1 className="text-xl font-bold">You have left campus</h1>
          <p className="text-sm text-muted-foreground">Visit completed. Have a great day!</p>
        </Card>
      </div>
    )
  }

  const isEntry = pass?.type === 'entry'
  const expired = isEntry && left === 0

  return (
    <div className="space-y-4">
      {back}
      {error && <Alert variant="warning">{error}</Alert>}

      {pass && (
        <Card className="mx-auto w-full items-center gap-4 px-4 py-6 text-center md:max-w-lg md:py-10">
          <div>
            <h1 className="text-lg font-bold">{isEntry ? 'Entry pass' : 'Exit pass'}</h1>
            {visit && (
              <p className="text-sm text-muted-foreground">
                {visit.purpose === 'staff' ? `Meeting ${visit.teacher?.name}` : purposeLabel(visit.purpose)}
              </p>
            )}
          </div>

          {/* QR codes always stay dark-on-white so every scanner can read them, in dark theme too. */}
          <div className={`rounded-2xl bg-white p-4 shadow-sm ${expired ? 'opacity-20' : ''}`}>
            <QRCodeSVG value={pass.token} size={256} level="M" className="h-auto w-full max-w-[min(70vw,300px)] md:max-w-[360px]" />
          </div>

          {isEntry ? (
            expired ? (
              <Alert variant="warning">This QR has expired. Please send a new request.</Alert>
            ) : (
              <div className="flex items-center gap-3">
                <CountdownRing secondsLeft={left} totalSeconds={300} label={formatClock(left)} />
                <p className="text-left text-sm text-muted-foreground">Show this to security at the gate.<br />It works once.</p>
              </div>
            )
          ) : (
            <p className="text-sm text-muted-foreground">Show this to security when you leave.</p>
          )}

          {status === 'inside' && visit?.purpose === 'staff' && !visit.arrivedAt && (
            <Button asChild size="lg" className="h-12 w-full">
              <Link to={`/student/scan/${id}`}>
                <ScanLine /> Scan teacher's QR
              </Link>
            </Button>
          )}
          {status === 'inside' && visit?.arrivedAt && (
            <p className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" /> Arrival at {visit.teacher?.name} confirmed
            </p>
          )}
        </Card>
      )}
    </div>
  )
}
