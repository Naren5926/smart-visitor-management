import { useEffect, useMemo, useRef, useState } from 'react'

// Runs `fn` now and then every `ms` while the tab is visible (pauses in the background to save battery/data).
export function usePolling(fn, ms, enabled = true) {
  const saved = useRef(fn)
  useEffect(() => {
    saved.current = fn
  })

  useEffect(() => {
    if (!enabled) return
    saved.current()
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') saved.current()
    }, ms)
    const onVisible = () => document.visibilityState === 'visible' && saved.current()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [ms, enabled])
}

// Seconds left until `expiresAt` (ms epoch), measured against the SERVER clock so a wrong phone
// clock cannot show a wrong countdown. `serverTime` is the server's "now" from the same response.
export function useSecondsLeft(expiresAt, serverTime) {
  const offset = useMemo(() => (serverTime ? serverTime - Date.now() : 0), [serverTime])
  const compute = () => (expiresAt ? Math.max(0, Math.ceil((expiresAt - (Date.now() + offset)) / 1000)) : 0)
  const [left, setLeft] = useState(compute)

  useEffect(() => {
    setLeft(compute())
    const id = setInterval(() => setLeft(compute()), 250)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt, offset])

  return left
}

export const formatClock = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

export const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
