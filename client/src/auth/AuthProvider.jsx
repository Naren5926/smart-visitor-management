import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch, ApiError } from '../api'
import { AuthContext } from './authContext'

const TOKEN_KEY = 'svms_token'

// localStorage can throw (private mode, blocked storage), so every access is guarded.
const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
const writeToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore: the user simply has to log in again next time */
  }
}

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(readToken)
  const [user, setUser] = useState(null)
  // "loading" only while we check a saved token with the server
  const [loading, setLoading] = useState(() => Boolean(readToken()))

  const logout = useCallback(() => {
    writeToken(null)
    setToken(null)
    setUser(null)
  }, [])

  // On page load, ask the server who the saved token belongs to.
  useEffect(() => {
    if (!token || user) return
    let cancelled = false
    apiFetch('/api/auth/me', { token })
      .then((data) => !cancelled && setUser(data.user))
      .catch((err) => {
        // Only drop the token if the server rejected it, not if the network failed.
        if (!cancelled && err instanceof ApiError && err.status >= 400 && err.status < 500) logout()
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [token, user, logout])

  const login = useCallback(async (email, password) => {
    const data = await apiFetch('/api/auth/login', { method: 'POST', body: { email, password } })
    writeToken(data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const value = useMemo(() => ({ user, token, loading, login, logout }), [user, token, loading, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
