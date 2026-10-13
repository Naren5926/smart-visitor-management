import { Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/auth/authContext'
import { apiFetch } from '@/api'
import { Alert } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import CopyButton from '@/components/CopyButton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ROLE_OPTIONS, roleLabel } from '@/lib/roles'

export default function ManageUsersPage() {
  const { token, user: me } = useAuth()
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [target, setTarget] = useState(null) // the user awaiting block/unblock confirmation

  const load = useCallback(() => {
    apiFetch('/api/users', { token })
      .then((d) => setUsers(d.users))
      .catch((err) => setError(err.message))
  }, [token])

  useEffect(load, [load])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (users ?? []).filter(
      (u) =>
        (roleFilter === 'all' || u.role === roleFilter) &&
        (!q ||
          [u.name, u.email, u.rollNo, u.className, u.year, roleLabel(u.role), u.status === 'active' ? 'active' : 'blocked']
            .some((v) => v != null && String(v).toLowerCase().includes(q)))
    )
  }, [users, search, roleFilter])

  async function confirmToggle() {
    const next = target.status === 'active' ? 'inactive' : 'active'
    setError('')
    setNotice(null)
    try {
      const { user } = await apiFetch(`/api/users/${target.id}/status`, {
        method: 'PATCH',
        token,
        body: { status: next },
      })
      setUsers((list) => list.map((u) => (u.id === user.id ? user : u)))
    } catch (err) {
      setError(err.message)
    }
    setTarget(null)
  }

  async function resend(u) {
    setError('')
    setNotice(null)
    try {
      const data = await apiFetch(`/api/users/${u.id}/resend-credentials`, { method: 'POST', token })
      setNotice({ email: u.email, tempPassword: data.tempPassword })
    } catch (err) {
      setError(err.message)
    }
  }

  const blocking = target?.status === 'active'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Block / Unblock</h1>
        <p className="text-sm text-muted-foreground">
          Blocked users cannot sign in, and any existing session stops working on its next request.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, roll number, class, year, role or status"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-14 pr-12 pl-12 text-base md:text-base"
            aria-label="Search users"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          )}
        </div>
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="h-14 text-base sm:w-52" aria-label="Filter by role">
          <option value="all">All roles</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.id} value={r.backendRole}>
              {r.label}
            </option>
          ))}
        </Select>
      </div>

      {error && <Alert>{error}</Alert>}
      {notice && (
        <Alert variant="success" className="flex flex-wrap items-center gap-2">
          New temporary password for <b>{notice.email}</b>:
          <code className="rounded bg-background px-2 py-1 font-mono text-foreground select-all">{notice.tempPassword}</code>
          <CopyButton text={notice.tempPassword} />
        </Alert>
      )}

      <Card className="py-2">
        <CardContent className="px-2">
          {!users ? (
            <p className="p-4 text-muted-foreground">Loading...</p>
          ) : visible.length === 0 ? (
            <p className="p-4 text-muted-foreground">No users match.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((u) => {
                  const isMe = u.id === me.id
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="font-medium">
                          {u.name} {isMe && <span className="text-xs text-muted-foreground">(you)</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {u.email}
                          {u.rollNo && ` · ${u.className}, Year ${u.year}, Roll ${u.rollNo}`}
                        </div>
                      </TableCell>
                      <TableCell>{roleLabel(u.role)}</TableCell>
                      <TableCell className="space-x-1">
                        <Badge variant={u.status === 'active' ? 'success' : 'destructive'}>
                          {u.status === 'active' ? 'Active' : 'Blocked'}
                        </Badge>
                        {u.mustChangePassword && <Badge variant="outline">Temp password</Badge>}
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        {u.mustChangePassword && (
                          <Button variant="ghost" size="sm" onClick={() => resend(u)}>
                            Resend credentials
                          </Button>
                        )}
                        <Button
                          variant={u.status === 'active' ? 'outline' : 'default'}
                          size="sm"
                          disabled={isMe}
                          title={isMe ? 'You cannot change your own status' : undefined}
                          onClick={() => setTarget(u)}
                        >
                          {u.status === 'active' ? 'Block' : 'Unblock'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(target)} onOpenChange={(open) => !open && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {blocking ? 'Block' : 'Unblock'} {target?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {blocking
                ? 'They will be signed out on their next request and cannot log in until unblocked.'
                : 'They will be able to sign in again.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle}>{blocking ? 'Block user' : 'Unblock user'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
