import { useAuth } from '../auth/authContext'

// Placeholder shown after login. Real role dashboards come in later phases.
export default function ProfilePage() {
  const { user, logout } = useAuth()

  return (
    <div className="text-left">
      <h2 className="text-lg font-semibold text-foreground">Welcome, {user.name}</h2>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="text-foreground">{user.email}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Role</dt>
          <dd className="capitalize text-foreground">{user.role}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Status</dt>
          <dd className="capitalize text-foreground">{user.status}</dd>
        </div>
      </dl>
      <button
        onClick={logout}
        className="mt-6 w-full rounded-lg border px-4 py-2 font-medium hover:bg-accent"
      >
        Log out
      </button>
    </div>
  )
}
