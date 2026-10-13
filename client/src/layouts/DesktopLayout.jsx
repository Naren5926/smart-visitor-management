import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/auth/authContext'
import ThemeToggle from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Desktop shell: fixed sidebar + header + animated page area. Shared by admin and teacher on wide screens.
export default function DesktopLayout({ nav, roleName, ariaLabel }) {
  const { user, logout } = useAuth()
  const location = useLocation()

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b bg-card md:sticky md:top-0 md:h-screen md:w-72 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 px-5 py-5 text-left md:py-8">
            <img src="/svms-logo.svg" alt="SVMS logo" className="size-11 dark:hidden" />
            <img src="/svms-logo-dark.svg" alt="" className="hidden size-11 dark:block" />
            <div className="leading-tight">
              <div className="text-lg font-bold">Visitor</div>
              <div className="text-sm font-medium text-muted-foreground">Management</div>
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible md:pb-0" aria-label={ariaLabel}>
            <p className="hidden px-3 pb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase md:block">Menu</p>
            {nav.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium whitespace-nowrap transition-colors',
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="admin-nav-pill"
                        className="absolute inset-0 rounded-xl bg-primary shadow-md"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <Icon className="relative size-5 transition-transform group-hover:scale-110" />
                    <span className="relative">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="hidden border-t p-4 md:block">
            <div className="rounded-xl bg-muted px-4 py-3 text-left">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-muted-foreground">{roleName}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 border-b bg-card px-4 py-3">
          <span className="mr-auto text-sm text-muted-foreground md:hidden">{user.name}</span>
          <Button variant="outline" onClick={logout}>
            <LogOut /> Log out
          </Button>
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-x-hidden p-4 text-left md:p-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
