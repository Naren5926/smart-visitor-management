import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/auth/authContext'
import { apiFetch } from '@/api'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// Every time a teacher blocked a student, with the reason they gave. The admin can lift a block.
export default function BlockLogsPage() {
  const { token } = useAuth()
  const [blocks, setBlocks] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    apiFetch('/api/admin/block-logs', { token })
      .then((d) => setBlocks(d.blocks))
      .catch((err) => setError(err.message))
  }, [token])

  useEffect(load, [load])

  async function lift(id) {
    setError('')
    try {
      await apiFetch(`/api/admin/block-logs/${id}/lift`, { method: 'POST', token })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Block logs</h1>
        <p className="text-sm text-muted-foreground">Students blocked by teachers, and why. Lifting a block lets them request that teacher again.</p>
      </div>

      {error && <Alert>{error}</Alert>}

      <Card className="py-2">
        <CardContent className="px-2">
          {!blocks ? (
            <p className="p-4 text-muted-foreground">Loading...</p>
          ) : blocks.length === 0 ? (
            <p className="p-4 text-muted-foreground">No blocks have been logged.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Blocked by</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blocks.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{new Date(b.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</TableCell>
                    <TableCell>
                      <div className="font-medium">{b.student.name}</div>
                      <div className="text-xs text-muted-foreground">{[b.student.className, b.student.rollNo].filter(Boolean).join(' · ')}</div>
                    </TableCell>
                    <TableCell>{b.teacher.name}</TableCell>
                    <TableCell className="max-w-xs whitespace-normal">{b.reason}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      {b.active ? (
                        <>
                          <Badge variant="destructive">Blocked</Badge>
                          <Button variant="outline" size="sm" onClick={() => lift(b.id)}>
                            Lift block
                          </Button>
                        </>
                      ) : (
                        <Badge variant="outline">Lifted</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
