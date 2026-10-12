import AuthProvider from './auth/AuthProvider'
import { useAuth } from './auth/authContext'
import HealthBadge from './components/HealthBadge'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'

function Screen() {
  const { user, loading } = useAuth()
  if (loading) return <p className="text-slate-600">Loading...</p>
  return user ? <ProfilePage /> : <LoginPage />
}

function App() {
  return (
    <AuthProvider>
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Smart Visitor Management</h1>
          <div className="mt-6">
            <Screen />
          </div>
          <div className="mt-6">
            <HealthBadge />
          </div>
        </div>
      </main>
    </AuthProvider>
  )
}

export default App
