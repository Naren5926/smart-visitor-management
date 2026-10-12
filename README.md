# Smart Visitor Management System

A college project. Roles: Admin, Host, Security, Visitor.
Workflow: visitor requests a visit -> host approves/rejects -> visitor gets a QR pass -> security scans and verifies it -> entry/exit recorded -> admin sees current visitors, history and reports.

**Current status: Phase 2 (database + authentication).** Visit requests, approvals, QR passes and dashboards are not built yet.

## Tech stack

- Frontend: React + Vite + Tailwind CSS v4
- Backend: Node.js + Express
- Database: MongoDB Atlas via Mongoose
- Auth: bcrypt password hashing + JWT (HS256)
- Validation: zod
- Tests: Jest + Supertest (backend)

## Folder structure

```
smart-visitor-management/
  client/            React + Vite frontend (port 5173)
    src/auth/        AuthProvider + useAuth (login state)
    src/pages/       LoginPage, ProfilePage (placeholder)
  server/            Express API (port 5000)
    src/models/      Mongoose models (User)
    src/middleware/  authenticate, authorize(role), validate, requireDb, rate limiter
    src/controllers/ route logic
    src/routes/      /api/auth, /api/users
    scripts/         createAdmin.js (one-time first-admin command)
    tests/           Jest tests
```

## Prerequisites

- Node.js 20+ and npm (developed with Node 24, npm 11)
- A free MongoDB Atlas account (see below)

## Setup

```bash
cd server
npm install
cp .env.example .env     # Windows PowerShell: Copy-Item .env.example .env

cd ../client
npm install
```

Then edit `server/.env` (it is ignored by git; never commit it):

1. **`JWT_SECRET` is required.** The server will not start with it empty or set to `change-me`. Generate a value:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
2. `MONGODB_URI` - see the Atlas section. If left blank, the server still starts (health check works) but `/api/auth` and `/api/users` answer `503 Database is not connected`.

## Connect MongoDB Atlas

1. Create a free account and an M0 (free) cluster at https://www.mongodb.com/atlas.
2. **Database Access** -> Add a database user (username + strong password; choose "Read and write to any database").
3. **Network Access** -> Add IP Address -> add your current IP (or "Allow access from anywhere" for a college demo only).
4. **Database** -> Connect -> Drivers -> copy the connection string (`mongodb+srv://...`).
5. In `server/.env`, set `MONGODB_URI` to that string, replacing `<db_user>` and `<db_password>`, and keep a database name such as `smart-visitor-management` after the host. URL-encode special characters in the password (for example `@` becomes `%40`).
6. Start the server. You should see `MongoDB connected`. If you see `Startup failed`, re-check the password, the IP allow-list and the string.

## Create the first Admin

Public sign-up only ever creates **Visitors**. The first Admin is created once from the command line:

1. In `server/.env` add `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (6+ characters) - see `.env.example`.
2. Run:
   ```bash
   cd server
   npm run create-admin
   ```
3. **Delete the `ADMIN_PASSWORD` line** from `.env` afterwards.

The command refuses to run if an Admin already exists. After that, Admins create Host, Security and further Admin accounts through `POST /api/users`.

## Run

```bash
cd server && npm run dev      # terminal 1
cd client && npm run dev      # terminal 2
```

Open http://localhost:5173 and sign in. Health check: http://localhost:5000/api/health

## API summary

| Method & path | Who | Purpose |
| --- | --- | --- |
| `GET /api/health` | public | server status |
| `POST /api/auth/register` | public | create a **Visitor** (`name`, `email`, `password` only; any `role` is rejected) |
| `POST /api/auth/login` | public | returns `{ token, user }` |
| `GET /api/auth/me` | any logged-in user | own profile |
| `GET /api/users` | admin | list users |
| `POST /api/users` | admin | create a user with any role |
| `PATCH /api/users/:id/status` | admin | `active` / `inactive` (not yourself) |

Send the token as `Authorization: Bearer <token>`.

## Security notes

- Passwords are hashed with bcrypt (cost 12); only the hash is stored and it is never returned by the API.
- Role and account status are re-read from the database on every request, so deactivating a user takes effect immediately even for tokens already issued.
- Login gives the same error for an unknown email and a wrong password; login/register are rate limited.
- Known simplification: the browser keeps the token in `localStorage`, which is simple but readable by any script on the page. Fine for this project; a production system might use httpOnly cookies.

## Checks

```bash
cd server && npm test        # backend tests
cd client && npm run lint    # frontend lint
cd client && npm run build   # production build
```

The backend tests use an in-memory fake of the User model, so they need no database. They verify our logic (validation, roles, tokens, hashing) but do **not** exercise real Mongoose/Atlas behaviour; that needs a real connection.

## Demo accounts (development only)

`cd server && npm run seed-demo` creates these users (password for all: `Demo@12345`):

| UI role | Email | Backend role |
| --- | --- | --- |
| Admin | admin@demo.test | admin |
| Student | student@demo.test | visitor |
| Teacher | teacher@demo.test | host |
| Security | security@demo.test | security |

The login page makes you pick a role first; the server-returned role must match the card you picked.

## Admin area

Sign in as an Admin to get the sidebar: **Dashboard** (counts, role chart, newest accounts), **Add People** and **Block / Unblock**. The sun/moon button (top right) switches light/dark theme.

New API routes (admin only unless noted): `GET /api/users/stats`, `POST /api/users` (`name`, `email`, `role`; a temporary password is generated and emailed), `POST /api/users/:id/resend-credentials`, and `POST /api/auth/change-password` (any logged-in user).

### Brevo email setup

1. Create a free account at https://www.brevo.com and verify a sender email under Senders & IP.
2. Create an API key (SMTP & API -> API Keys).
3. In `server/.env` set `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` (the verified sender) and optionally `BREVO_SENDER_NAME`, then restart the server.

Email is optional: the admin always sees the temporary password on screen (copy button) and can download bulk-upload credentials as a CSV.

## Visits, QR passes and gate scanning

Flow: a **student** asks for a visit (Library, Lab or Meet a staff member). Library/Lab are approved instantly; staff visits wait for the **teacher** to approve. Approval issues a QR that is valid for **5 minutes** and works once. **Security** scans it to log ENTRY. For staff visits the student then scans the teacher's **rotating QR** (changes every 30 s) to prove they reached the teacher. On the way out the student shows an **exit QR** and security scans it. Security's dashboard shows who is inside campus and why.

Teachers can **block a student from visiting them**; the reason is logged under **Admin -> Block logs**, where the admin can lift it. Admin's dashboard also shows how many people are inside now.

| Role | Screens |
| --- | --- |
| Student | Home (status, QR), New visit, Pass, Scan teacher QR |
| Teacher | Requests (approve/reject), My QR (rotating), Block a student |
| Security | Dashboard (inside now, by purpose), Scan, manual check-out |

### Testing on a phone (camera needs HTTPS)

Browsers only allow camera access on `https://` or `localhost`. To use phones on the same wifi:

```bash
cd client && npm run dev:phone     # HTTPS dev server, reachable on your network
```

Open the `https://<your-laptop-ip>:5173` address that Vite prints, accept the one-time certificate warning, then sign in with the demo accounts. Keep `npm run dev` running in `server/` as usual (Vite forwards `/api`). The QR scanner library may download its decoder from a CDN on browsers without a built-in barcode reader, so the phone needs internet access.

New API routes: `/api/visits/*` (students; teachers decide), `/api/teacher/*`, `/api/security/*`, `/api/admin/block-logs`.
