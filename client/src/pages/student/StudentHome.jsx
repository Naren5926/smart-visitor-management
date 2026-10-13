import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Plus, QrCode, ScanLine } from 'lucide-react'
import { useAuth } from '@/auth/authContext'
import { apiFetch } from '@/api'
import VisitStatusBadge from '@/components/VisitStatusBadge'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatTime, usePolling, useSecondsLeft, formatClock } from '@/lib/hooks'
import { isOpenVisit, purposeLabel } from '@/lib/visits'

function ActiveVisit({ visit, serverTime, onCancel, busy }) {
  const left = useSecondsLeft(visit.status === 'approved' ? new Date(visit.qrExpiresAt).getTime() : 0, serverTime)
  const dest = visit.purpose === 'staff' ? `Meet ${visit.teacher?.name}` : purposeLabel(visit.purpose)

  return (
    <Card className="gap-4 border-primary/30">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base">{dest}</CardTitle>
          {visit.reason && <p className="mt-1 text-sm text-muted-foreground">{visit.reason}</p>}
        </div>
        <VisitStatusBadge status={visit.status} />
      </CardHeader>
      <CardContent className="space-y-3">
        {visit.status === 'pending' && (
          <p className="text-sm text-muted-foreground">Waiting for {visit.teacher?.name} to respond. This page updates by itself.</p>
        )}
        {visit.status === 'approved' && (
          <p className="text-sm">
            Show this QR to security within <b className="tabular-nums">{formatClock(left)}</b>.
          </p>
        )}
        {visit.status === 'inside' && (
          <p className="text-sm text-muted-foreground">
            Entered at {formatTime(visit.enteredAt)}.{' '}
            {visit.purpose === 'staff' && (visit.arrivedAt ? 'Arrival at the teacher confirmed.' : 'Scan the teacher\'s QR when you reach them.')}
          </p>
        )}

        <div className="grid gap-2">
          {visit.status === 'approved' && (
            <Button asChild size="lg" className="h-12">
              <Link to={`/student/pass/${visit.id}`}>
                <QrCode /> Show my QR
              </Link>
            </Button>
          )}
          {visit.status === 'inside' && (
            <>
              {visit.purpose === 'staff' && !visit.arrivedAt && (
                <Button asChild size="lg" className="h-12">
                  <Link to={`/student/scan/${visit.id}`}>
                    <ScanLine /> Scan teacher's QR
                  </Link>
                </Button>
              )}
              <Button asChild size="lg" variant="outline" className="h-12">
                <Link to={`/student/pass/${visit.id}`}>
                  <QrCode /> Show exit QR
                </Link>
              </Button>
            </>
          )}
          {(visit.status === 'pending' || visit.status === 'approved') && (
            <Button variant="ghost" onClick={() => onCancel(visit.id)} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Cancel request
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function StudentHome() {
  const { token, user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () =>
    apiFetch('/api/visits/mine', { token })
      .then((d) => {
        setData(d)
        setError('')
      })
      .catch((err) => setError(err.message))

  usePolling(load, 5000)

  async function cancel(id) {
    setBusy(true)
    try {
      await apiFetch(`/api/visits/${id}/cancel`, { method: 'POST', token })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const visits = data?.visits ?? []
  const active = visits.find(isOpenVisit)
  const past = visits.filter((v) => !isOpenVisit(v))

  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Hi, {user.name.split(' ')[0]}</h1>
        <p className="text-sm text-muted-foreground">
          {user.className && `${user.className} · Year ${user.year} · Roll ${user.rollNo}`}
        </p>
      </div>

      {error && <Alert>{error}</Alert>}
      {!data && !error && <p className="text-muted-foreground">Loading...</p>}

      {data && active && <ActiveVisit visit={active} serverTime={data.serverTime} onCancel={cancel} busy={busy} />}

      {data && !active && (
        <Card className="items-center gap-3 py-8 text-center md:py-14">
          <p className="text-sm text-muted-foreground">No visit in progress.</p>
          <Button asChild size="lg" className="h-12">
            <Link to="/student/new">
              <Plus /> New visit request
            </Link>
          </Button>
        </Card>
      )}

      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Recent visits</h2>
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {past.map((v) => (
            <Card key={v.id} className="gap-1 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{v.purpose === 'staff' ? `Meet ${v.teacher?.name}` : purposeLabel(v.purpose)}</span>
                <VisitStatusBadge status={v.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(v.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                {v.decisionNote && ` · ${v.decisionNote}`}
              </p>
            </Card>
          ))}
          </div>
        </section>
      )}
    </div>
  )
}
