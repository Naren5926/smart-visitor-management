import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const alertVariants = cva('relative w-full rounded-lg border px-4 py-3 text-sm', {
  variants: {
    variant: {
      destructive: 'border-destructive/30 bg-destructive/5 text-destructive',
      success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
      warning: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    },
  },
  defaultVariants: { variant: 'destructive' },
})

function Alert({ className, variant, ...props }) {
  return <div role="alert" data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />
}

export { Alert }
