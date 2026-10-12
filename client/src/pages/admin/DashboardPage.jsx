import { useEffect, useState } from 'react'
import { DoorOpen } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useAuth } from '@/auth/authContext'
import { apiFetch } from '@/api'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PEOPLE_ROLES, roleLabel } from '@/lib/roles'

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b']

export default function DashboardPage() {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/users/stats', { token })
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [token])

  if (error) return <Alert>{error}</Alert>
  if (!data) return <p className="text-muted-foreground">Loading...</p>

  const chartData = PEOPLE_ROLES.map((r) => ({ name: r.plural, value: data.stats[r.backendRole].total }))
  const total = chartData.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">People registered on the platform.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PEOPLE_ROLES.map(({ id, plural, icon: Icon, backendRole }) => {
          const s = data.stats[backendRole]
          return (
            <Card key={id} className="gap-3">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardDescription>{plural}</CardDescription>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{s.total}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.active} active · {s.blocked} blocked
                </p>
              </CardContent>
            </Card>
          )
        })}
        <Card className="gap-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardDescription>Inside campus now</CardDescription>
            <DoorOpen className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.insideNow ?? 0}</div>
            <p className="mt-1 text-xs text-muted-foreground">checked in at the gate</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Role distribution</CardTitle>
            <CardDescription>Students, teachers and security</CardDescription>
          </CardHeader>
          <CardContent>
            {total === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No people added yet.</p>
            ) : (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-2 flex flex-wrap justify-center gap-4 text-xs">
                  {chartData.map((d, i) => (
                    <li key={d.name} className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full" style={{ background: CHART_COLORS[i] }} />
                      {d.name}: {d.value}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recently added</CardTitle>
            <CardDescription>The five newest accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell>{roleLabel(u.role)}</TableCell>
                    <TableCell>
                      <Badge variant={u.status === 'active' ? 'success' : 'destructive'}>
                        {u.status === 'active' ? 'Active' : 'Blocked'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
