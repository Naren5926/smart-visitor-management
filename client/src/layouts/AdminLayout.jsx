import { AlertTriangle, Ban, LayoutDashboard, UserPlus, UserX } from 'lucide-react'
import DesktopLayout from './DesktopLayout'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/add-people', label: 'Add People', icon: UserPlus },
  { to: '/admin/users', label: 'Block / Unblock', icon: UserX },
  { to: '/admin/block-logs', label: 'Block logs', icon: Ban },
  { to: '/admin/black-marks', label: 'Black marks', icon: AlertTriangle },
]

export default function AdminLayout() {
  return <DesktopLayout nav={NAV} roleName="Administrator" ariaLabel="Admin navigation" />
}
