import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useAuth } from '@/auth/authContext'
import { apiFetch } from '@/api'
import QrScanner from '@/components/QrScanner'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

// The student points the camera at the teacher's rotating QR to prove they reached the teacher.
export default function ScanTeacherPage() {
  const { id } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const handling = useRef(false)

  async function onResult(code) {
    if (handling.current) return
    handling.current = true
    setBusy(true)
    setError('')
    try {
      await apiFetch(`/api/visits/${id}/verify-arrival`, { method: 'POST', token, body: { code } })
      navigate(`/student/pass/${id}`, { replace: true })
    } catch (err) {
      setError(err.message)
      handling.current = false
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 md:max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to={`/student/pass/${id}`}>
          <ArrowLeft /> Back
        </Link>
      </Button>
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Scan the teacher's QR</h1>
        <p className="text-sm text-muted-foreground">Ask the teacher to open "My QR" and point your camera at it. It changes every 30 seconds.</p>
      </div>
      <QrScanner onResult={onResult} paused={busy} />
      {busy && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Checking...
        </p>
      )}
      {error && <Alert>{error}</Alert>}
    </div>
  )
}
