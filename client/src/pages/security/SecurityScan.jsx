import { useRef, useState } from 'react'
import { CheckCircle2, Loader2, ScanLine, XCircle } from 'lucide-react'
import { useAuth } from '@/auth/authContext'
import { apiFetch } from '@/api'
import QrScanner from '@/components/QrScanner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { purposeLabel } from '@/lib/visits'

export default function SecurityScan() {
  const { token } = useAuth()
  const [result, setResult] = useState(null) // { ok, action, visit } or { ok:false, message }
  const [busy, setBusy] = useState(false)
  const handling = useRef(false)

  async function onResult(text) {
    if (handling.current) return
    handling.current = true
    setBusy(true)
    try {
      const data = await apiFetch('/api/security/scan', { method: 'POST', token, body: { token: text } })
      setResult({ ok: true, ...data })
    } catch (err) {
      setResult({ ok: false, message: err.message })
    } finally {
      setBusy(false)
    }
  }

  function scanNext() {
    handling.current = false
    setResult(null)
  }

  const v = result?.visit

  return (
    <div className="mx-auto w-full space-y-4 md:max-w-3xl md:space-y-6">
      <div>
        <h1 className="text-xl font-bold md:text-3xl">Scan a pass</h1>
        <p className="text-sm text-muted-foreground">Point the camera at the student's QR. Entry and exit are detected automatically.</p>
      </div>

      {!result && (
        <>
          <QrScanner onResult={onResult} paused={busy} />
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ScanLine className="size-4" />}
            {busy ? 'Checking...' : 'Waiting for a QR code'}
          </p>
        </>
      )}

      {result && (
        <Card
          className={cn(
            'items-center gap-3 border-2 px-4 py-8 text-center',
            result.ok ? 'border-emerald-500 bg-emerald-500/10' : 'border-destructive bg-destructive/10'
          )}
          role="status"
        >
          {result.ok ? <CheckCircle2 className="size-14 text-emerald-500" /> : <XCircle className="size-14 text-destructive" />}
          {result.ok ? (
            <>
              <p className="text-2xl font-bold">{result.action === 'entry' ? 'ENTRY allowed' : 'EXIT logged'}</p>
              <div>
                <p className="text-lg font-semibold">{v.student.name}</p>
                <p className="text-sm text-muted-foreground">
                  {[v.student.className, v.student.rollNo && `Roll ${v.student.rollNo}`].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Badge variant="secondary">{v.purpose === 'staff' ? `Meeting ${v.teacher?.name}` : purposeLabel(v.purpose)}</Badge>
              {result.action === 'exit' && v.purpose === 'staff' && (
                <Badge variant={v.arrivedAt ? 'success' : 'warning'}>
                  {v.arrivedAt ? 'Teacher QR was verified' : 'Teacher QR was NOT verified'}
                </Badge>
              )}
              {result.blackMark && (
                <Badge variant="destructive">
                  Black mark added ({result.blackMark.markCount}){result.blackMark.blocked ? ' · student blocked' : ''}
                </Badge>
              )}
            </>
          ) : (
            <>
              <p className="text-2xl font-bold">Not allowed</p>
              <p className="text-base">{result.message}</p>
            </>
          )}
        </Card>
      )}

      {result && (
        <Button size="lg" className="h-12 w-full" onClick={scanNext}>
          <ScanLine /> Scan next
        </Button>
      )}
    </div>
  )
}
