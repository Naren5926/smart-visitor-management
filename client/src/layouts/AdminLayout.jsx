import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, LogOut, UserPlus, UserX } from 'lucide-react'
import { useAuth } from '@/auth/authContext'
import ThemeToggle from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/add-people', label: 'Add People', icon: UserPlus },
  { to: '/admin/users', label: 'Block / Unblock', icon: UserX },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b bg-card md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="px-4 py-4 text-left font-semibold md:py-6">Visitor Management</div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-0" aria-label="Admin navigation">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 border-b bg-card px-4 py-3">
          <span className="mr-auto text-sm text-muted-foreground md:mr-0">{user.name}</span>
          <Button variant="outline" size="sm" onClick={logout} className="h-9">
            <LogOut /> Log out
          </Button>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-4 text-left md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
