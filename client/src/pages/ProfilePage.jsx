import { useAuth } from '../auth/authContext'

// Placeholder shown after login. Real role dashboards come in later phases.
export default function ProfilePage() {
  const { user, logout } = useAuth()

  return (
    <div className="text-left">
      <h2 className="text-lg font-semibold text-slate-900">Welcome, {user.name}</h2>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Email</dt>
          <dd className="text-slate-900">{user.email}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Role</dt>
          <dd className="capitalize text-slate-900">{user.role}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Status</dt>
          <dd className="capitalize text-slate-900">{user.status}</dd>
        </div>
      </dl>
      <button
        onClick={logout}
        className="mt-6 w-full rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
      >
        Log out
      </button>
    </div>
  )
}
