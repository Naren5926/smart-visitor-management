import { BookOpen, FlaskConical, UserRound } from 'lucide-react'

export const PURPOSES = [
  { id: 'library', label: 'Library', hint: 'Study or borrow books', icon: BookOpen },
  { id: 'lab', label: 'Lab', hint: 'Practical or project work', icon: FlaskConical },
  { id: 'staff', label: 'Meet a staff member', hint: 'Needs the teacher\'s approval', icon: UserRound },
]

export const purposeLabel = (id) => PURPOSES.find((p) => p.id === id)?.label ?? id

export const STATUS_INFO = {
  pending: { label: 'Waiting for approval', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
  expired: { label: 'QR expired', variant: 'outline' },
  inside: { label: 'Inside campus', variant: 'success' },
  completed: { label: 'Completed', variant: 'secondary' },
}

export const isOpenVisit = (v) => ['pending', 'approved', 'inside'].includes(v.status)
