import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/theme/themeContext'
import { Button } from '@/components/ui/button'

// Going to dark: the sun leaves upward and the moon rises from below. Going to light: the reverse.
const variants = {
  enter: (toDark) => ({ y: toDark ? 24 : -24, opacity: 0, rotate: toDark ? 30 : -30 }),
  center: { y: 0, opacity: 1, rotate: 0 },
  exit: (toDark) => ({ y: toDark ? -24 : 24, opacity: 0, rotate: toDark ? -30 : 30 }),
}

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const reduce = useReducedMotion()
  const isDark = theme === 'dark'
  const Icon = isDark ? Moon : Sun

  return (
    <Button
      type="button"
      variant="outline"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="relative size-9 overflow-hidden rounded-full p-0"
    >
      <AnimatePresence initial={false} mode="popLayout" custom={isDark}>
        <motion.span
          key={theme}
          custom={isDark}
          variants={variants}
          initial={reduce ? false : 'enter'}
          animate="center"
          exit={reduce ? undefined : 'exit'}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="flex items-center justify-center"
        >
          <Icon className="size-4" />
        </motion.span>
      </AnimatePresence>
    </Button>
  )
}
