import { useCallback, useEffect, useState } from 'react'
import { Ban, Loader2, Search } from 'lucide-react'
import { useAuth } from '@/auth/authContext'
import { apiFetch } from '@/api'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const studentLine = (s) => [s.className, s.rollNo && `Roll ${s.rollNo}`].filter(Boolean).join(' · ')

export default function TeacherBlocks() {
  const { token } = useAuth()
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [picked, setPicked] = useState(null)
  const [reason, setReason] = useState('')
  const [blocks, setBlocks] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadBlocks = useCallback(() => {
    apiFetch('/api/teacher/blocks', { token })
      .then((d) => setBlocks(d.blocks))
      .catch((err) => setError(err.message))
  }, [token])

  useEffect(loadBlocks, [loadBlocks])

  // Search as the teacher types (after a short pause).
  useEffect(() => {
    if (q.trim().length < 2) return
    const t = setTimeout(() => {
      apiFetch(`/api/teacher/students?q=${encodeURIComponent(q.trim())}`, { token })
        .then((d) => setResults(d.students))
        .catch((err) => setError(err.message))
    }, 300)
    return () => clearTimeout(t)
  }, [q, token])

  async function submit(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    setSubmitting(true)
    try {
      await apiFetch('/api/teacher/blocks', { method: 'POST', token, body: { studentId: picked.id, reason: reason.trim() } })
      setNotice(`${picked.name} can no longer request visits with you. The admin has been notified.`)
      setPicked(null)
      setReason('')
      setQ('')
      setResults([])
      loadBlocks()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Block a student</h1>
        <p className="text-sm text-muted-foreground">
          Only students who have visited you can be blocked. They won't be able to request visits with you. Your reason is logged for the admin, who can lift the block.
        </p>
      </div>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}

      {!picked ? (
        <div className="space-y-3 md:max-w-2xl">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-12 pl-9" placeholder="Search students who have visited you" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search students" />
          </div>
          {(q.trim().length >= 2 ? results : []).map((s) => (
            <button
              key={s.id}
              onClick={() => setPicked(s)}
              className="w-full rounded-xl border bg-card p-3 text-left transition-colors hover:bg-accent active:scale-[0.99]"
            >
              <p className="font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground">{studentLine(s)}</p>
            </button>
          ))}
          {q.trim().length >= 2 && results.length === 0 && <p className="text-sm text-muted-foreground">No visited students found. You can only block students who have visited you.</p>}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3 rounded-xl border bg-card p-4 md:max-w-2xl">
          <div>
            <p className="font-semibold">{picked.name}</p>
            <p className="text-xs text-muted-foreground">{studentLine(picked)}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (sent to the admin)</Label>
            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-11" onClick={() => setPicked(null)}>
              Back
            </Button>
            <Button type="submit" className="h-11" disabled={submitting || reason.trim().length < 5}>
              {submitting ? <Loader2 className="animate-spin" /> : <Ban />} Block
            </Button>
          </div>
        </form>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Your blocks</h2>
        {blocks && blocks.length === 0 && <p className="text-sm text-muted-foreground">You haven't blocked anyone.</p>}
        <div className="grid gap-3 md:grid-cols-2">
        {blocks?.map((b) => (
          <Card key={b.id} className="gap-1 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{b.student.name}</span>
              <Badge variant={b.active ? 'destructive' : 'outline'}>{b.active ? 'Blocked' : 'Lifted by admin'}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{b.reason}</p>
          </Card>
        ))}
        </div>
      </section>
    </div>
  )
}
