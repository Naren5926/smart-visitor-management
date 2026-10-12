import { Badge } from '@/components/ui/badge'
import { STATUS_INFO } from '@/lib/visits'

export default function VisitStatusBadge({ status }) {
  const info = STATUS_INFO[status] ?? { label: status, variant: 'outline' }
  return <Badge variant={info.variant}>{info.label}</Badge>
}
