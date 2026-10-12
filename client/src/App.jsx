import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AuthProvider from './auth/AuthProvider'
import { useAuth } from './auth/authContext'
import HealthBadge from './components/HealthBadge'
import ThemeToggle from './components/ThemeToggle'
import { Card } from '@/components/ui/card'
import ThemeProvider from './theme/ThemeProvider'
import AdminLayout from './layouts/AdminLayout'
import AddPeoplePage from './pages/admin/AddPeoplePage'
import DashboardPage from './pages/admin/DashboardPage'
import ManageUsersPage from './pages/admin/ManageUsersPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'

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
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    )
  }
  return (
    <CardShell showToggle>
      <ProfilePage />
    </CardShell>
  )
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Screen />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
