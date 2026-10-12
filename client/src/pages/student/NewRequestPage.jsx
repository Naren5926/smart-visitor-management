import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/auth/authContext'
import { apiFetch } from '@/api'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PURPOSES } from '@/lib/visits'
import { cn } from '@/lib/utils'

export default function NewRequestPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [purpose, setPurpose] = useState(null)
  const [teachers, setTeachers] = useState([])
  const [teacherId, setTeacherId] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    apiFetch('/api/visits/teachers', { token })
      .then((d) => setTeachers(d.teachers))
      .catch((err) => setError(err.message))
  }, [token])

  const isStaff = purpose === 'staff'
  const canSubmit = purpose && (!isStaff || (teacherId && reason.trim().length >= 3))

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const body = isStaff ? { purpose, teacherId, reason: reason.trim() } : { purpose }
      const { visit } = await apiFetch('/api/visits', { method: 'POST', token, body })
      navigate(visit.status === 'approved' ? `/student/pass/${visit.id}` : '/student', { replace: true })
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Where are you going?</h1>
        <p className="text-sm text-muted-foreground">Library and labs get a QR instantly. Staff visits need approval.</p>
      </div>

      <div className="grid gap-3" role="radiogroup" aria-label="Purpose of visit">
        {PURPOSES.map(({ id, label, hint, icon: Icon }) => {
          const selected = purpose === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setPurpose(id)}
              className={cn(
                'flex min-h-16 items-center gap-3 rounded-xl border p-4 text-left outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.98]',
                selected ? 'border-primary bg-primary text-primary-foreground shadow-md' : 'bg-card hover:bg-accent'
              )}
            >
              <Icon className="size-6 shrink-0" />
              <span>
                <span className="block font-medium">{label}</span>
                <span className={cn('block text-xs', selected ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{hint}</span>
              </span>
            </button>
          )
        })}
      </div>

      {isStaff && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teacher">Which teacher?</Label>
            <Select id="teacher" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="h-11">
              <option value="">Select a teacher</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for the visit</Label>
            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="e.g. Doubt about the assignment" />
          </div>
        </div>
      )}

      {error && <Alert>{error}</Alert>}

      <Button type="submit" size="lg" className="h-12 w-full" disabled={!canSubmit || submitting}>
        {submitting && <Loader2 className="animate-spin" />}
        {isStaff ? 'Send request' : 'Get my QR'}
      </Button>
    </form>
  )
}
