import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/auth/authContext'
import { apiFetch } from '@/api'
import PasswordInput from '@/components/PasswordInput'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

// Shown right after sign-in while the account still has an admin-issued temporary password.
// The temporary password is not asked for again: the user just proved they know it by signing in.
export default function ChangePasswordPage() {
  const { token, updateUser, logout } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (newPassword !== confirm) return setError('The new passwords do not match')
    setSubmitting(true)
    try {
      const { user } = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        token,
        body: { newPassword },
      })
      updateUser(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left" noValidate>
      <div>
        <h2 className="text-lg font-semibold">Choose a new password</h2>
        <p className="text-sm text-muted-foreground">
          You signed in with a temporary password. Set your own to continue; the temporary one stops working.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="new">New password (at least 6 characters)</Label>
        <PasswordInput id="new" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm new password</Label>
        <PasswordInput id="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {error && <Alert>{error}</Alert>}
      <Button type="submit" className="w-full" disabled={submitting || !newPassword || !confirm}>
        {submitting && <Loader2 className="animate-spin" />}
        Save new password
      </Button>
      <Button type="button" variant="ghost" className="w-full" onClick={logout}>
        Log out
      </Button>
    </form>
  )
}
