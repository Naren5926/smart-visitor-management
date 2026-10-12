import { GraduationCap, Presentation, ShieldCheck, Settings } from 'lucide-react'

// UI roles mapped to the backend role they correspond to (backend roles unchanged for now).
export const ROLE_OPTIONS = [
  { id: 'student', label: 'Student', plural: 'Students', hint: 'Request a visit', backendRole: 'visitor', icon: GraduationCap },
  { id: 'teacher', label: 'Teacher', plural: 'Teachers', hint: 'Approve visitors', backendRole: 'host', icon: Presentation },
  { id: 'security', label: 'Security', plural: 'Security', hint: 'Scan and verify', backendRole: 'security', icon: ShieldCheck },
  { id: 'admin', label: 'Admin', plural: 'Admins', hint: 'Manage everything', backendRole: 'admin', icon: Settings },
]

// People an admin can add or manage (everything except admins).
export const PEOPLE_ROLES = ROLE_OPTIONS.filter((r) => r.id !== 'admin')

export const roleLabel = (backendRole) =>
  ROLE_OPTIONS.find((r) => r.backendRole === backendRole)?.label ?? backendRole
