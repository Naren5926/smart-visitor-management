import { cn } from '@/lib/utils'

// Circular progress ring with the remaining time in the middle.
export default function CountdownRing({ secondsLeft, totalSeconds, label, className }) {
  const size = 56
  const stroke = 5
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const fraction = Math.min(1, Math.max(0, secondsLeft / totalSeconds))
  const urgent = secondsLeft <= 15

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} role="timer" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          className={cn('transition-[stroke-dashoffset] duration-300', urgent ? 'stroke-destructive' : 'stroke-emerald-500')}
        />
      </svg>
      <span className="absolute text-xs font-semibold tabular-nums">{label}</span>
    </div>
  )
}
