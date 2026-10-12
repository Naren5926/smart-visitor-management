import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '@/auth/authContext'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ThemeToggle from '@/components/ThemeToggle'
import { ROLE_OPTIONS } from '@/lib/roles'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const { login } = useAuth()
  const [roleId, setRoleId] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const role = ROLE_OPTIONS.find((r) => r.id === roleId)

  function pickRole(id) {
    setRoleId(id)
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!role) return
    setError('')
    setSubmitting(true)
    try {
      await login(email.trim(), password, role.backendRole)
    } catch (err) {
      setError(err.message)
      setPassword('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="text-left" noValidate>
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>
      <h2 className="text-lg font-semibold">Who are you?</h2>
      <p className="text-sm text-muted-foreground">Choose your role to continue.</p>

      <div className="mt-4 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Select your role">
        {ROLE_OPTIONS.map(({ id, label, hint, icon: Icon }) => {
          const selected = id === roleId
          return (
            <motion.button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => pickRole(id)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className={cn(
                'flex flex-col items-start gap-1 rounded-xl border p-3 text-left outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50',
                selected ? 'border-primary bg-primary text-primary-foreground shadow-md' : 'bg-card hover:bg-accent'
              )}
            >
              <Icon className="size-5" />
              <span className="text-sm font-medium">{label}</span>
              <span className={cn('text-xs', selected ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{hint}</span>
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence initial={false}>
        {role && (
          <motion.div
            key="credentials"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-4 px-1 pt-5 pb-1">
              <p className="text-sm font-medium">Signing in as {role.label}</p>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              {error && <Alert>{error}</Alert>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Button type="submit" size="lg" className="mt-5 w-full" disabled={!role || submitting || !email || !password}>
        {submitting && <Loader2 className="animate-spin" />}
        {submitting ? 'Signing in...' : role ? `Sign in as ${role.label}` : 'Select a role to continue'}
      </Button>
    </form>
  )
}
