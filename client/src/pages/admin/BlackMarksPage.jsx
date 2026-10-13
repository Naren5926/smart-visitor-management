import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Ban, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/auth/authContext'
import { apiFetch } from '@/api'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const when = (d) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
const studentLine = (s) => [s.className, s.rollNo && `Roll ${s.rollNo}`].filter(Boolean).join(' · ')

const TABS = [
  { id: 'notifications', label: 'Notifications' },
  { id: 'history', label: 'Block history' },
]

// Black marks (staff visit ended without meeting the teacher), automatic blocks, and every block so far.
export default function BlackMarksPage() {
  const { token } = useAuth()
  const [tab, setTab] = useState('notifications')
  const [marks, setMarks] = useState(null)
  const [teacherBlocks, setTeacherBlocks] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    Promise.all([apiFetch('/api/admin/black-marks', { token }), apiFetch('/api/admin/block-logs', { token })])
      .then(([m, b]) => {
        setMarks(m)
        setTeacherBlocks(b.blocks)
      })
      .catch((err) => setError(err.message))
  }, [token])

  useEffect(load, [load])

  // One timeline of every block: automatic ones from black marks, and the ones teachers made.
  const history = useMemo(() => {
    if (!marks || !teacherBlocks) return null
    const auto = marks.events
      .filter((e) => e.type === 'auto_block')
      .map((e) => ({
        id: e.id,
        kind: 'Automatic',
        student: e.student,
        by: 'System',
        reason: e.reason,
        createdAt: e.createdAt,
        active: e.stillBlocked,
      }))
    const byTeacher = teacherBlocks.map((b) => ({
      id: b.id,
      kind: 'Teacher',
      student: b.student,
      by: b.teacher.name,
      reason: b.reason,
      createdAt: b.createdAt,
      active: b.active,
    }))
    return [...auto, ...byTeacher].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [marks, teacherBlocks])

  const ready = Boolean(marks && history)
  const markCount = marks?.events.filter((e) => e.type === 'black_mark').length ?? 0
  const autoCount = marks?.events.filter((e) => e.type === 'auto_block').length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Black marks</h1>
        <p className="text-sm text-muted-foreground">
          A student gets a black mark when a staff visit ends without scanning the teacher's QR. After {marks?.limit ?? 3} marks they are
          blocked automatically until you unblock them in Block / Unblock (which also resets their count).
        </p>
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Black marks issued', value: markCount, icon: AlertTriangle },
          { label: 'Automatic blocks', value: autoCount, icon: ShieldAlert },
          { label: 'Blocked right now', value: history?.filter((h) => h.active).length ?? 0, icon: Ban },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="flex-row items-center gap-4 px-5 py-5">
            <Icon className="size-8 text-muted-foreground" />
            <div>
              <p className="text-3xl font-bold tabular-nums">{ready ? value : '–'}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="inline-flex rounded-xl bg-muted p-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-lg px-5 py-2.5 text-base font-semibold transition-colors',
              tab === t.id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!ready && !error && <p className="text-muted-foreground">Loading...</p>}

      {ready && tab === 'notifications' && (
        <div className="space-y-3">
          {marks.events.length === 0 && (
            <Card className="py-10 text-center text-muted-foreground">No black marks yet. Everyone has been meeting their teachers.</Card>
          )}
          {marks.events.map((e) => {
            const auto = e.type === 'auto_block'
            return (
              <Card key={e.id} className={cn('flex-row items-start gap-4 px-5 py-4', auto && 'border-destructive/50 bg-destructive/5')}>
                {auto ? (
                  <ShieldAlert className="mt-0.5 size-6 shrink-0 text-destructive" />
                ) : (
                  <AlertTriangle className="mt-0.5 size-6 shrink-0 text-amber-500" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {e.student.name} <span className="text-sm font-normal text-muted-foreground">{studentLine(e.student)}</span>
                  </p>
                  <p className="text-sm">{e.reason}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{when(e.createdAt)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {auto ? (
                    <Badge variant={e.stillBlocked ? 'destructive' : 'outline'}>{e.stillBlocked ? 'Blocked' : 'Unblocked'}</Badge>
                  ) : (
                    <Badge variant={e.cleared ? 'outline' : 'warning'}>
                      {e.cleared ? 'Cleared' : `Mark ${e.markCount ?? ''} of ${marks.limit}`}
                    </Badge>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {ready && tab === 'history' && (
        <Card className="py-2">
          <CardContent className="space-y-1 px-2">
            {history.length === 0 && <p className="p-4 text-muted-foreground">Nobody has been blocked yet.</p>}
            {history.map((h) => (
              <div key={`${h.kind}-${h.id}`} className="flex flex-wrap items-center gap-3 rounded-lg px-3 py-3 hover:bg-accent/50">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {h.student.name} <span className="text-sm font-normal text-muted-foreground">{studentLine(h.student)}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{h.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    {when(h.createdAt)} · by {h.by}
                  </p>
                </div>
                <Badge variant="secondary">{h.kind === 'Automatic' ? 'Auto-block' : 'Teacher block'}</Badge>
                <Badge variant={h.active ? 'destructive' : 'outline'}>{h.active ? 'Active' : 'Lifted'}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
