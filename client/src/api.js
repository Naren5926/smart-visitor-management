const BASE_URL = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// Small wrapper around fetch: JSON in/out, optional bearer token, readable errors.
export async function apiFetch(path, { method = 'GET', body, token } = {}) {
  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the backend running?')
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.message || `Request failed (${res.status})`)
  return data
}
