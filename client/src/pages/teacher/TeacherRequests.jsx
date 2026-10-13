import { useState } from 'react'
import { Check, Loader2, X } from 'lucide-react'
import { useAuth } from '@/auth/authContext'
import { apiFetch } from '@/api'
import VisitStatusBadge from '@/components/VisitStatusBadge'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatTime, usePolling } from '@/lib/hooks'

function StudentLine({ student }) {
  return (
    <div>
      <p className="font-semibold">{student.name}</p>
      <p className="text-xs text-muted-foreground">
        {[student.className, student.rollNo && `Roll ${student.rollNo}`].filter(Boolean).join(' · ')}
      </p>
    </div>
  )
}

export default function TeacherRequests() {
  const { token } = useAuth()
  const [visits, setVisits] = useState(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = () =>
    apiFetch('/api/teacher/requests', { token })
      .then((d) => {
        setVisits(d.visits)
        setError('')
      })
      .catch((err) => setError(err.message))

  usePolling(load, 5000)

  async function decide(id, decision) {
    setBusyId(id)
    setError('')
    try {
      await apiFetch(`/api/visits/${id}/decision`, { method: 'POST', token, body: { decision } })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const pending = (visits ?? []).filter((v) => v.status === 'pending')
  const recent = (visits ?? []).filter((v) => v.status !== 'pending').slice(0, 15)

  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Visit requests</h1>
        <p className="text-sm text-muted-foreground">Students who want to meet you. Approving gives them a 5-minute QR.</p>
      </div>

      {error && <Alert>{error}</Alert>}
      {!visits && !error && <p className="text-muted-foreground">Loading...</p>}

      {visits && pending.length === 0 && (
        <Card className="items-center py-8 text-center text-sm text-muted-foreground">No requests waiting.</Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {pending.map((v) => (
        <Card key={v.id} className="gap-3 px-4 py-4">
          <div className="flex items-start justify-between gap-2">
            <StudentLine student={v.student} />
            <span className="text-xs text-muted-foreground">{formatTime(v.createdAt)}</span>
          </div>
          <p className="rounded-lg bg-muted px-3 py-2 text-sm">{v.reason}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-11" disabled={busyId === v.id} onClick={() => decide(v.id, 'reject')}>
              <X /> Reject
            </Button>
            <Button className="h-11" disabled={busyId === v.id} onClick={() => decide(v.id, 'approve')}>
              {busyId === v.id ? <Loader2 className="animate-spin" /> : <Check />} Approve
            </Button>
          </div>
        </Card>
      ))}
      </div>

      {recent.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Earlier</h2>
          <div className="grid gap-3 md:grid-cols-2">
          {recent.map((v) => (
            <Card key={v.id} className="gap-1 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{v.student.name}</span>
                <VisitStatusBadge status={v.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                {v.reason} · {new Date(v.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                {v.arrivedAt && ' · arrival confirmed'}
              </p>
            </Card>
          ))}
          </div>
        </section>
      )}
    </div>
  )
}
