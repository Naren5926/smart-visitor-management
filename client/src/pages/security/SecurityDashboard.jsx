import { useState } from 'react'
import { BookOpen, FlaskConical, LogOut, UserRound, Users } from 'lucide-react'
import { useAuth } from '@/auth/authContext'
import { apiFetch } from '@/api'
import { Alert } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatTime, usePolling } from '@/lib/hooks'
import { purposeLabel } from '@/lib/visits'

const PURPOSE_ICONS = { library: BookOpen, lab: FlaskConical, staff: UserRound }

export default function SecurityDashboard() {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [target, setTarget] = useState(null)

  const load = () =>
    apiFetch('/api/security/overview', { token })
      .then((d) => {
        setData(d)
        setError('')
      })
      .catch((err) => setError(err.message))

  usePolling(load, 5000)

  async function checkout() {
    try {
      await apiFetch(`/api/security/checkout/${target.id}`, { method: 'POST', token })
      await load()
    } catch (err) {
      setError(err.message)
    }
    setTarget(null)
  }

  return (
    <div className="space-y-5 md:space-y-8">
      {error && <Alert>{error}</Alert>}
      {!data && !error && <p className="text-muted-foreground">Loading...</p>}

      {data && (
        <>
          <div className="grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-6">
          <Card className="col-span-3 items-center justify-center gap-1 py-6 text-center md:col-span-1 md:min-h-52 md:py-8">
            <Users className="size-6 text-muted-foreground md:size-7" />
            <p className="text-6xl font-bold tabular-nums md:text-6xl">{data.insideCount}</p>
            <p className="text-sm text-muted-foreground md:text-base">inside campus now</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Today: {data.entriesToday} in · {data.exitsToday} out
            </p>
          </Card>

          {Object.entries(data.byPurpose).map(([purpose, count]) => {
              const Icon = PURPOSE_ICONS[purpose]
              return (
                <Card key={purpose} className="items-center justify-center gap-1 px-2 py-3 text-center md:min-h-52 md:py-8">
                  <Icon className="size-4 text-muted-foreground md:size-7" />
                  <p className="text-2xl font-bold tabular-nums md:text-6xl">{count}</p>
                  <p className="text-[11px] leading-tight md:text-base text-muted-foreground">{purposeLabel(purpose)}</p>
                </Card>
              )
            })}
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground md:text-lg">Currently inside</h2>
            {data.inside.length === 0 && <p className="text-sm text-muted-foreground">Nobody is inside.</p>}
            <div className="grid gap-3 md:grid-cols-2 md:gap-4 2xl:grid-cols-3">
            {data.inside.map((v) => (
              <Card key={v.id} className="gap-2 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{v.student.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[v.student.className, v.student.rollNo && `Roll ${v.student.rollNo}`].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">in {formatTime(v.enteredAt)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{v.purpose === 'staff' ? `Meeting ${v.teacher?.name}` : purposeLabel(v.purpose)}</Badge>
                  {v.purpose === 'staff' && (
                    <Badge variant={v.arrivedAt ? 'success' : 'warning'}>{v.arrivedAt ? 'Arrival verified' : 'Not verified yet'}</Badge>
                  )}
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setTarget(v)}>
                    <LogOut /> Check out
                  </Button>
                </div>
              </Card>
            ))}
            </div>
          </section>
        </>
      )}

      <AlertDialog open={Boolean(target)} onOpenChange={(open) => !open && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Check out {target?.student.name}?</AlertDialogTitle>
            <AlertDialogDescription>Use this only if their phone can't show the exit QR.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={checkout}>Check out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
