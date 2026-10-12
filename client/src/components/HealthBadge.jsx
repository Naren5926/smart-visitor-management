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
    loading: 'bg-slate-200 text-slate-700',
    ok: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
  }[status.state]

  return (
    <p className={`inline-block rounded-full px-4 py-1 text-sm font-medium ${badge}`}>
      {status.state === 'loading' && 'Checking backend...'}
      {status.state === 'ok' && `Backend: ${status.data.status}`}
      {status.state === 'error' && `Backend unreachable (${status.message})`}
    </p>
  )
}
