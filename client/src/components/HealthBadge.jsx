import { useEffect, useState } from 'react'

export default function HealthBadge() {
  const [status, setStatus] = useState({ state: 'loading' })

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded with ${res.status}`)
        return res.json()
      })
      .then((data) => setStatus({ state: 'ok', data }))
      .catch((err) => setStatus({ state: 'error', message: err.message }))
  }, [])

  const badge = {
    loading: 'bg-muted text-muted-foreground',
    ok: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    error: 'bg-destructive/15 text-destructive',
  }[status.state]

  return (
    <p className={`inline-block rounded-full px-4 py-1 text-sm font-medium ${badge}`}>
      {status.state === 'loading' && 'Checking backend...'}
      {status.state === 'ok' && `Backend: ${status.data.status}`}
      {status.state === 'error' && `Backend unreachable (${status.message})`}
    </p>
  )
}
