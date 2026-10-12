import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Ban, ClipboardList, Home, LayoutDashboard, PlusCircle, QrCode, ScanLine } from 'lucide-react'
import AuthProvider from './auth/AuthProvider'
import { useAuth } from './auth/authContext'
import HealthBadge from './components/HealthBadge'
import ThemeToggle from './components/ThemeToggle'
import { Card } from '@/components/ui/card'
import ThemeProvider from './theme/ThemeProvider'
import AdminLayout from './layouts/AdminLayout'
import AddPeoplePage from './pages/admin/AddPeoplePage'
import ManageUsersPage from './pages/admin/ManageUsersPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import LoginPage from './pages/LoginPage'
import MobileLayout from './layouts/MobileLayout'
import BlockLogsPage from './pages/admin/BlockLogsPage'
import NewRequestPage from './pages/student/NewRequestPage'
import PassPage from './pages/student/PassPage'
import StudentHome from './pages/student/StudentHome'
import TeacherBlocks from './pages/teacher/TeacherBlocks'
import TeacherQr from './pages/teacher/TeacherQr'
import TeacherRequests from './pages/teacher/TeacherRequests'
import SecurityDashboard from './pages/security/SecurityDashboard'

// Heavy pages (charts, camera scanner) load only when opened, keeping the first load small on phones.
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'))
const ScanTeacherPage = lazy(() => import('./pages/student/ScanTeacherPage'))
const SecurityScan = lazy(() => import('./pages/security/SecurityScan'))

const STUDENT_NAV = [
  { to: '/student', label: 'Home', icon: Home, end: true },
  { to: '/student/new', label: 'New visit', icon: PlusCircle },
]
const TEACHER_NAV = [
  { to: '/teacher', label: 'Requests', icon: ClipboardList, end: true },
  { to: '/teacher/qr', label: 'My QR', icon: QrCode },
  { to: '/teacher/blocks', label: 'Block', icon: Ban },
]
const SECURITY_NAV = [
  { to: '/security', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/security/scan', label: 'Scan', icon: ScanLine },
]

// Small centered card used for login, forced password change and the placeholder profile.
function CardShell({ children, showToggle = false }) {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      {showToggle && (
        <div className="fixed top-4 right-4">
          <ThemeToggle />
        </div>
      )}
      <Card className="w-full max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold">Smart Visitor Management</h1>
        <div className="mt-6">{children}</div>
        <div className="mt-2">
          <HealthBadge />
        </div>
      </Card>
    </main>
  )
}

function Screen() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <CardShell>
        <p className="text-muted-foreground">Loading...</p>
      </CardShell>
    )
  }
  if (!user) {
    return (
      <CardShell>
        <LoginPage />
      </CardShell>
    )
  }
  if (user.mustChangePassword) {
    return (
      <CardShell showToggle>
        <ChangePasswordPage />
      </CardShell>
    )
  }

  if (user.role === 'admin') {
    return (
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="add-people" element={<AddPeoplePage />} />
          <Route path="users" element={<ManageUsersPage />} />
          <Route path="block-logs" element={<BlockLogsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    )
  }

  if (user.role === 'visitor') {
    return (
      <Routes>
        <Route path="/student" element={<MobileLayout title="Student" nav={STUDENT_NAV} />}>
          <Route index element={<StudentHome />} />
          <Route path="new" element={<NewRequestPage />} />
          <Route path="pass/:id" element={<PassPage />} />
          <Route path="scan/:id" element={<ScanTeacherPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/student" replace />} />
      </Routes>
    )
  }

  if (user.role === 'host') {
    return (
      <Routes>
        <Route path="/teacher" element={<MobileLayout title="Teacher" nav={TEACHER_NAV} />}>
          <Route index element={<TeacherRequests />} />
          <Route path="qr" element={<TeacherQr />} />
          <Route path="blocks" element={<TeacherBlocks />} />
        </Route>
        <Route path="*" element={<Navigate to="/teacher" replace />} />
      </Routes>
    )
  }

  if (user.role === 'security') {
    return (
      <Routes>
        <Route path="/security" element={<MobileLayout title="Security gate" nav={SECURITY_NAV} />}>
          <Route index element={<SecurityDashboard />} />
          <Route path="scan" element={<SecurityScan />} />
        </Route>
        <Route path="*" element={<Navigate to="/security" replace />} />
      </Routes>
    )
  }

  return (
    <CardShell showToggle>
      <p className="text-muted-foreground">No screen is available for this role yet.</p>
    </CardShell>
  )
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<p className="p-6 text-muted-foreground">Loading...</p>}>
            <Screen />
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
