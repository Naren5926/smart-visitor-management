import { useState } from 'react'
import { Download, Loader2, Upload } from 'lucide-react'
import { useAuth } from '@/auth/authContext'
import { apiFetch } from '@/api'
import CopyButton from '@/components/CopyButton'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { downloadText, parseStudentsCsv, toCsv } from '@/lib/csv'
import { PEOPLE_ROLES } from '@/lib/roles'
import { cn } from '@/lib/utils'

const SAMPLE_CSV = 'Name,Class,Year,Roll No\r\nAsha Kumar,CSE-A,3,21CS001\r\nRavi Prasad,CSE-A,3,21CS002\r\n'

function SingleForm() {
  const { token } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [className, setClassName] = useState('')
  const [year, setYear] = useState('')
  const [rollNo, setRollNo] = useState('')
  const [roleId, setRoleId] = useState('student')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const isStudent = roleId === 'student'
  // Students need class, year and roll no (email optional); teachers and security need an email.
  const canSubmit = name.trim() && (isStudent ? className.trim() && year.trim() && rollNo.trim() : email.trim())

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setResult(null)
    setSubmitting(true)
    try {
      const picked = PEOPLE_ROLES.find((r) => r.id === roleId)
      const data = await apiFetch('/api/users', {
        method: 'POST',
        token,
        body: {
          name: name.trim(),
          email: email.trim(),
          role: picked.backendRole,
          ...(isStudent && { className: className.trim(), year: year.trim(), rollNo: rollNo.trim() }),
        },
      })
      setResult({ ...data, label: picked.label })
      setName('')
      setEmail('')
      setClassName('')
      setYear('')
      setRollNo('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New account</CardTitle>
        <CardDescription>A unique temporary password is generated. They must change it on first sign-in.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select id="role" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
              {PEOPLE_ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {isStudent && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <Input id="class" required value={className} onChange={(e) => setClassName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input id="year" required value={year} onChange={(e) => setYear(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rollno">Roll no</Label>
                <Input id="rollno" required value={rollNo} onChange={(e) => setRollNo(e.target.value)} />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{isStudent ? 'Email (optional, used to sign in)' : 'Email (used to sign in)'}</Label>
            <Input id="email" type="email" required={!isStudent} value={email} onChange={(e) => setEmail(e.target.value)} />
            {isStudent && (
              <p className="text-xs text-muted-foreground">
                If left empty, the student signs in with <code>rollno@student.local</code>.
              </p>
            )}
          </div>
          {error && <Alert>{error}</Alert>}
          {result && (
            <Alert variant="success" className="space-y-2">
              <p>
                {result.label} account created. Sign-in email: <b>{result.user.email}</b>. Copy the temporary password now; it is shown only once.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded bg-background px-2 py-1 font-mono text-base text-foreground select-all">{result.tempPassword}</code>
                <CopyButton text={result.tempPassword} />
              </div>
              {result.emailStatus === 'sent' && <p>It was also emailed to them.</p>}
              {result.emailStatus === 'failed' && <p>Email delivery failed, so share the password manually.</p>}
            </Alert>
          )}
          <Button type="submit" disabled={submitting || !canSubmit}>
            {submitting && <Loader2 className="animate-spin" />}
            {submitting ? 'Creating...' : 'Create account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function BulkUpload() {
  const { token } = useAuth()
  const [students, setStudents] = useState(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  async function onFile(e) {
    const file = e.target.files?.[0]
    setError('')
    setResult(null)
    setStudents(null)
    if (!file) return
    setFileName(file.name)
    try {
      setStudents(parseStudentsCsv(await file.text()))
    } catch (err) {
      setError(err.message)
    }
  }

  async function upload() {
    setError('')
    setSubmitting(true)
    try {
      const data = await apiFetch('/api/users/bulk', { method: 'POST', token, body: { students } })
      setResult(data)
      setStudents(null)
      setFileName('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const createdRows = result?.results.filter((r) => r.status === 'created') ?? []
  const credentialsCsv = () =>
    toCsv(
      ['Name', 'Class', 'Year', 'Roll No', 'Login email', 'Temporary password'],
      createdRows.map((r) => [r.name, r.className, r.year, r.rollNo, r.email, r.tempPassword])
    )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload students (CSV)</CardTitle>
        <CardDescription>
          Columns: Name, Class, Year, Roll No (and an optional Email). Without an email, the student signs in with
          <code className="mx-1">rollno@student.local</code>. Maximum 100 per file.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Label htmlFor="csv" className="cursor-pointer rounded-md border px-3 py-2 hover:bg-accent">
            <Upload className="size-4" /> Choose CSV file
          </Label>
          <input id="csv" type="file" accept=".csv,text/csv" onChange={onFile} className="sr-only" />
          <span className="text-sm text-muted-foreground">{fileName || 'No file chosen'}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => downloadText('students-sample.csv', SAMPLE_CSV)}>
            <Download /> Sample file
          </Button>
        </div>

        {error && <Alert>{error}</Alert>}

        {students && (
          <div className="space-y-3">
            <p className="text-sm">
              <b>{students.length}</b> student(s) found. Preview:
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Roll No</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.slice(0, 8).map((s, i) => (
                  <TableRow key={i}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.className}</TableCell>
                    <TableCell>{s.year}</TableCell>
                    <TableCell>{s.rollNo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {students.length > 8 && <p className="text-xs text-muted-foreground">...and {students.length - 8} more</p>}
            <Button onClick={upload} disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {submitting ? 'Creating accounts...' : `Create ${students.length} account(s)`}
            </Button>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <Alert variant={result.created ? 'success' : 'warning'}>
              {result.created} account(s) created, {result.skipped} skipped. Temporary passwords are shown only once, so
              download them now.
            </Alert>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => downloadText('student-credentials.csv', credentialsCsv())} disabled={!createdRows.length}>
                <Download /> Download credentials (CSV)
              </Button>
              <CopyButton
                text={createdRows.map((r) => `${r.name}\t${r.email}\t${r.tempPassword}`).join('\n')}
                label="Copy all"
                className={cn(!createdRows.length && 'pointer-events-none opacity-50')}
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Login email</TableHead>
                  <TableHead>Temporary password</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.results.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      {r.name} <span className="text-xs text-muted-foreground">{r.rollNo}</span>
                    </TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>
                      {r.status === 'created' ? (
                        <code className="font-mono select-all">{r.tempPassword}</code>
                      ) : (
                        <Badge variant="outline">Skipped: {r.reason}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function AddPeoplePage() {
  const [tab, setTab] = useState('single')

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add People</h1>
        <p className="text-sm text-muted-foreground">Create accounts one by one, or upload a whole class of students.</p>
      </div>

      <div className="inline-flex rounded-lg bg-muted p-1" role="tablist">
        {[
          ['single', 'Add one person'],
          ['bulk', 'Bulk upload students'],
        ].map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'single' ? <SingleForm /> : <BulkUpload />}
    </div>
  )
}
