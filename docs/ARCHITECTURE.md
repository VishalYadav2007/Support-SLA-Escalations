# SupportSLA Board: Architecture Specification

## 1. Project Overview

**Project title:** SupportSLA Board
**Project theme:** Support response deadline tracker

**Problem statement:** Support teams miss response targets because tickets are not prioritised by due time. The product is a ticket tracker with configurable response targets and escalation status.

**Differentiating feature:** Tickets nearing or exceeding their response deadline are highlighted automatically, so the team always knows what to handle next.

**Who uses it:**
- **Admin:** configures SLA policies and priority rules, manages agents, views analytics, exports reports.
- **Agent:** works the queue, assigns tickets to self, responds to customers, writes internal notes, resolves tickets.

**Goals:**
1. Make response deadlines impossible to miss visually.
2. Keep the product simple enough that a new support agent understands it within minutes.
3. Work reliably: every feature in this spec must function without errors, lag, or data loss.

**Non-goals (do not build in this version):**
- Customer-facing portal or email ingestion
- Third-party integrations (Slack, email, webhooks)
- Multi-tenant organisations
- Mobile native apps (the web UI must be responsive, that is all)

---

## 2. Tech Stack (mandatory)

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18+ with Vite | Functional components and hooks only |
| Frontend routing | React Router v6 | |
| Frontend HTTP | Axios | Single configured instance with auth interceptor |
| Frontend charts | Recharts | Used only on the Dashboard |
| Frontend styling | Plain CSS with CSS variables | Basic, clean, minimal. The full UI is designed later |
| Backend runtime | Node.js 20 LTS | |
| Backend framework | Express 4 | REST API under `/api` |
| Database | MongoDB 6+ | Accessed through Mongoose 8 |
| Auth | JSON Web Tokens (`jsonwebtoken`) + `bcryptjs` | Access token only, stored in memory plus localStorage |
| Validation | Zod | Every request body, query, and param is validated |
| Security middleware | `helmet`, `cors`, `express-rate-limit` | |
| Logging | `morgan` (dev) | |
| Config | `dotenv` | |
| Testing (backend) | Jest + Supertest + `mongodb-memory-server` | |
| Testing (frontend) | Vitest + React Testing Library | Smoke tests only |
| CSV export | Manual CSV builder with proper escaping | No extra dependency |

**Not allowed:** TypeScript (keep JavaScript), GraphQL, Redux (use React state and context), Socket.IO (live refresh uses polling), any ORM other than Mongoose, any UI framework such as MUI or Bootstrap.

---

## 3. System Architecture

### 3.1 Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    Browser (React SPA)                       │
│  Login │ Dashboard │ Ticket Board (Kanban/List) │ Ticket     │
│        │           │                            │ Detail     │
│  SLA Policy Builder (Admin) │ Users (Admin) │ Export         │
│  AuthContext │ Axios client (JWT header, 401 handler)        │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS/JSON  (REST, /api/*)
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                  Express API Server (Node.js)                │
│                                                              │
│  Middleware pipeline:                                        │
│   helmet → cors → rate-limit → json parser → morgan          │
│   → authenticate (JWT) → authorize (role) → validate (Zod)   │
│   → route handler → central error handler                    │
│                                                              │
│  Modules (routes → controller → service → model):            │
│   auth │ users │ tickets │ comments │ sla │ audit │ reports  │
│                                                              │
│  SLA Engine (pure functions, used by services and jobs)      │
│  Background Scheduler (setInterval, every 60 seconds)        │
└───────────────────────────┬──────────────────────────────────┘
                            │ Mongoose
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                     MongoDB (single database)                │
│  users │ tickets │ comments │ auditlogs │ slapolicies │      │
│  counters                                                    │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Request Flow (example: agent assigns a ticket to self)

1. React button click calls `api.patch('/tickets/:id/assign', { assigneeId: 'self' })`.
2. Axios adds `Authorization: Bearer <jwt>`.
3. Express: `authenticate` decodes token and loads user. `authorize` checks role. Zod validates body.
4. `ticketService.assign()` loads the ticket, updates `assignedTo`, sets `firstResponseAt` if this is the first agent action, writes an `AuditLog` entry, and saves. Each step runs in order.
5. Response returns the updated ticket with computed `slaState` and `remainingMs`.
6. The client updates local state. The ticket board refreshes on its 30-second poll.

### 3.3 Repository Structure

```
supportsla-board/
├── docs/
│   └── ARCHITECTURE.md              (this file)
├── server/
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── app.js                   (express app, middleware, routes mounted)
│   │   ├── server.js                (connects DB, starts HTTP server and scheduler)
│   │   ├── config/
│   │   │   ├── env.js               (validates env vars with Zod, fails fast)
│   │   │   └── db.js                (mongoose connection with retry-free clear error)
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Ticket.js
│   │   │   ├── Comment.js
│   │   │   ├── AuditLog.js
│   │   │   ├── SlaPolicy.js
│   │   │   └── Counter.js
│   │   ├── sla/
│   │   │   ├── slaEngine.js         (pure functions: computeTarget, computeState, etc.)
│   │   │   └── slaEngine.test.js
│   │   ├── services/
│   │   │   ├── authService.js
│   │   │   ├── userService.js
│   │   │   ├── ticketService.js
│   │   │   ├── commentService.js
│   │   │   ├── policyService.js
│   │   │   ├── auditService.js
│   │   │   └── reportService.js
│   │   ├── controllers/             (thin: call service, return JSON)
│   │   ├── routes/                  (route definitions + validators + middleware)
│   │   ├── validators/              (Zod schemas)
│   │   ├── middleware/
│   │   │   ├── authenticate.js
│   │   │   ├── authorize.js
│   │   │   ├── validate.js
│   │   │   ├── errorHandler.js
│   │   │   └── notFound.js
│   │   ├── jobs/
│   │   │   └── slaScheduler.js
│   │   ├── utils/
│   │   │   ├── AppError.js
│   │   │   ├── csv.js
│   │   │   └── ticketNumber.js
│   │   └── seed/
│   │       └── seed.js
│   └── tests/
│       ├── auth.test.js
│       ├── tickets.test.js
│       ├── bulk.test.js
│       ├── policies.test.js
│       └── reports.test.js
└── client/
    ├── package.json
    ├── index.html
    ├── vite.config.js               (proxy /api to http://localhost:5000)
    └── src/
        ├── main.jsx
        ├── App.jsx                  (routes, protected route wrapper)
        ├── api/
        │   └── http.js              (axios instance, interceptors)
        ├── context/
        │   └── AuthContext.jsx
        ├── hooks/
        │   ├── useNow.js            (ticks every second for countdowns)
        │   └── usePolling.js        (refetch every 30s)
        ├── components/
        │   ├── AppShell.jsx         (sidebar/topbar, responsive)
        │   ├── SlaBadge.jsx
        │   ├── SlaCountdown.jsx
        │   ├── PriorityPill.jsx
        │   ├── StatusPill.jsx
        │   ├── FilterBar.jsx
        │   ├── BulkActionBar.jsx
        │   ├── TicketCard.jsx
        │   ├── TicketTable.jsx
        │   ├── CommentThread.jsx
        │   ├── AuditTimeline.jsx
        │   └── RuleBuilder.jsx
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── DashboardPage.jsx
        │   ├── TicketsPage.jsx      (board/list toggle, search, filters, bulk)
        │   ├── TicketDetailPage.jsx
        │   ├── NewTicketPage.jsx
        │   ├── PoliciesPage.jsx     (admin: SLA rule builder)
        │   ├── UsersPage.jsx        (admin)
        │   └── NotFoundPage.jsx
        ├── utils/
        │   ├── formatTime.js
        │   └── constants.js
        └── styles/
            └── globals.css
```

---

## 4. Data Models (Mongoose)

All models use `timestamps: true` unless noted. Every `_id` is a Mongo ObjectId.

### 4.1 User

| Field | Type | Rules |
|---|---|---|
| name | String | required, 2 to 80 chars, trimmed |
| email | String | required, unique, lowercase, valid email |
| passwordHash | String | required, `select: false` |
| role | String | enum `['admin', 'agent']`, default `agent` |
| isActive | Boolean | default `true`. Deactivated users cannot log in |
| lastLoginAt | Date | |

Indexes: `{ email: 1 }` unique.

### 4.2 Ticket

| Field | Type | Rules |
|---|---|---|
| ticketNumber | String | unique, format `SLA-1001`, generated by `Counter` |
| title | String | required, 5 to 150 chars |
| description | String | required, 10 to 5000 chars |
| status | String | enum `['open','in_progress','pending','resolved']`, default `open` |
| priority | String | enum `['low','medium','high','urgent']`, default `medium` |
| category | String | enum `['billing','technical','account','access','general']` |
| tags | [String] | max 10 tags, each 1 to 30 chars, lowercase, unique per ticket |
| requester | { name: String (required), email: String (valid email, optional) } | |
| assignedTo | ObjectId ref User | nullable |
| assignedAt | Date | nullable |
| createdBy | ObjectId ref User | required |
| slaTargetMinutes | Number | the response target chosen at creation (snapshot, does not change if policy changes later) |
| slaDeadline | Date | `createdAt + slaTargetMinutes`, shifted forward by every pause |
| pausedSince | Date | nullable, set while status is `pending` |
| pausedTotalMs | Number | default 0, total paused time |
| firstResponseAt | Date | nullable. Set on first agent public comment or first move to `in_progress` |
| breachedAt | Date | nullable. Set once by the scheduler when deadline passes unanswered |
| escalationLevel | Number | 0 = none, 1 = escalated (set when breached or when a warning ticket is unassigned) |
| resolvedAt | Date | nullable |

Indexes:
- `{ ticketNumber: 1 }` unique
- `{ status: 1, slaDeadline: 1 }` (queue sorting by deadline)
- `{ assignedTo: 1, status: 1 }`
- `{ priority: 1, status: 1 }`
- `{ escalationLevel: 1 }`
- Text index: `{ title: 'text', description: 'text', tags: 'text', ticketNumber: 'text' }`

### 4.3 Comment

| Field | Type | Rules |
|---|---|---|
| ticket | ObjectId ref Ticket | required, indexed |
| author | ObjectId ref User | required |
| body | String | required, 1 to 3000 chars |
| isInternal | Boolean | default `false`. Internal notes are never shown to the requester (the app has no requester view, but the flag is stored and displayed with a badge) |

Index: `{ ticket: 1, createdAt: 1 }`.

### 4.4 AuditLog

| Field | Type | Rules |
|---|---|---|
| ticket | ObjectId ref Ticket | nullable (system or user events may not have a ticket) |
| actor | ObjectId ref User | nullable (null for scheduler events) |
| action | String | enum: `TICKET_CREATED`, `STATUS_CHANGED`, `PRIORITY_CHANGED`, `ASSIGNED`, `UNASSIGNED`, `COMMENT_ADDED`, `TAGS_CHANGED`, `SLA_PAUSED`, `SLA_RESUMED`, `SLA_BREACHED`, `ESCALATED`, `BULK_ACTION`, `POLICY_UPDATED`, `USER_CREATED`, `USER_UPDATED` |
| details | Mixed | e.g. `{ from: 'open', to: 'in_progress' }` |

Indexes: `{ ticket: 1, createdAt: -1 }`, `{ createdAt: -1 }`. Audit entries are never edited or deleted.

### 4.5 SlaPolicy

Only one document is active at a time (`isActive: true`). Admins edit it through the rule builder.

| Field | Type | Rules |
|---|---|---|
| name | String | default `Default Policy` |
| isActive | Boolean | exactly one active |
| defaultTargetsMinutes | { urgent, high, medium, low } | defaults: urgent 60, high 240, medium 480, low 1440. Each must be an integer from 5 to 43200 |
| warningThresholdPercent | Number | default 75, range 50 to 95. Ticket enters `warning` once this percentage of its target has elapsed |
| rules | [ { name, enabled, conditions: { priority?, category?, tag? }, targetMinutes, order } ] | Rule builder. Evaluated in `order`. First match wins. Max 20 rules |
| updatedBy | ObjectId ref User | |

**Rule matching:** A rule matches if every condition it defines matches the ticket. A condition left empty means "any". If no rule matches, use `defaultTargetsMinutes[priority]`.

### 4.6 Counter

| Field | Type |
|---|---|
| _id | String (e.g. `ticketNumber`) |
| seq | Number |

Use `findOneAndUpdate({_id}, {$inc:{seq:1}}, {upsert:true, new:true})` to generate ticket numbers atomically. The first ticket is `SLA-1001`.

---

## 5. SLA Engine (the core logic)

Implement in `server/src/sla/slaEngine.js` as **pure functions** (no database calls, no `Date.now()` inside; `now` is always passed in). This makes them unit testable.

### 5.1 Functions

```
resolveTargetMinutes(ticket, policy) -> number
  1. Sort policy.rules by order, skip disabled rules.
  2. For each rule, check conditions: priority, category, tag (tag matches if ticket.tags includes it).
  3. First matching rule returns its targetMinutes.
  4. Otherwise return policy.defaultTargetsMinutes[ticket.priority].

computeDeadline(createdAt, targetMinutes) -> Date
  createdAt + targetMinutes * 60000

computeSlaState(ticket, policy, now) -> {
  state: 'paused' | 'closed' | 'met' | 'missed' | 'breached' | 'warning' | 'normal',
  remainingMs: number | null,
  percentElapsed: number | null,
  isEscalated: boolean
}
  Rules, evaluated in this order:
  a. if ticket.status === 'resolved':
       if firstResponseAt and firstResponseAt <= slaDeadline  -> 'met'
       if firstResponseAt and firstResponseAt > slaDeadline   -> 'missed'
       if no firstResponseAt                                  -> 'closed'
       remainingMs = null
  b. if ticket.status === 'pending':                          -> 'paused'
       remainingMs = slaDeadline - pausedSince   (frozen value)
  c. if firstResponseAt is set:
       firstResponseAt <= slaDeadline  -> 'met'
       otherwise                       -> 'missed'
  d. no response yet, status open/in_progress:
       remainingMs = slaDeadline - now
       if remainingMs <= 0                                  -> 'breached'
       percentElapsed = 100 * (1 - remainingMs / (slaDeadline - createdAt - pausedTotalMs))
       if percentElapsed >= warningThresholdPercent         -> 'warning'
       otherwise                                            -> 'normal'
  isEscalated = escalationLevel >= 1
```

Note on the `paused` remaining value: display the remaining time frozen at the moment of pausing, computed as `slaDeadline - pausedSince` before any shift. Because the deadline shifts on resume, store the frozen value on the client only as "Paused" text. Do not show a countdown while paused.

Note on `percentElapsed`: the denominator is the active target window, so pauses do not count against the agent. Use `activeWindowMs = slaTargetMinutes * 60000` for the percentage. Keep it simple: `percentElapsed = 100 * (1 - remainingMs / (slaTargetMinutes * 60000))`, clamped between 0 and 100.

### 5.2 State Transitions and Side Effects (in `ticketService`)

| Action | Side effects |
|---|---|
| Create ticket | Generate ticketNumber. Resolve target. Set `slaTargetMinutes`, `slaDeadline`. Audit `TICKET_CREATED`. |
| Status → `pending` | Set `pausedSince = now`. Audit `SLA_PAUSED`. |
| Status leaves `pending` | `pausedTotalMs += now - pausedSince`. `slaDeadline += (now - pausedSince)`. `pausedSince = null`. Audit `SLA_RESUMED`. |
| Status → `in_progress` (by agent, first time) | If `firstResponseAt` is null, set it to `now`. |
| Status → `resolved` | Set `resolvedAt = now`. If still paused, first apply the resume step. |
| Status → `open` (reopen) | Clear `resolvedAt`. Do not clear `firstResponseAt`. |
| Public comment added by agent (first time) | If `firstResponseAt` is null, set it to `now`. |
| Priority changes | Recompute target. Only applies if `firstResponseAt` is null. Shift deadline by the difference between the new and old target. Audit `PRIORITY_CHANGED`. |
| Bulk status change | Run each ticket through the same transition logic above. |

### 5.3 Scheduler (`jobs/slaScheduler.js`)

- Runs every 60 seconds, started from `server.js`, after the DB connects.
- Query: `{ status: { $in: ['open','in_progress'] }, firstResponseAt: null, breachedAt: null, slaDeadline: { $lt: now } }`.
- For each match: set `breachedAt = now`, `escalationLevel = 1`, and write an `SLA_BREACHED` audit entry with `actor: null`.
- Also escalate warning tickets that are unassigned: query `{ status: 'open', assignedTo: null, escalationLevel: 0 }`, compute state. If `warning`, set `escalationLevel = 1` and write `ESCALATED` audit.
- Use `updateMany` where possible, or a loop with `findOneAndUpdate` guards to avoid double-writing. Must be **idempotent**: running it twice creates no duplicate audit entries.
- Wrap each run in try/catch. Log errors. Never crash the process.

---

## 6. Authentication and Authorization

- **Login:** `POST /api/auth/login` with email and password. Compare with bcrypt. Return a JWT signed with `JWT_SECRET`, valid for `JWT_EXPIRES_IN` (default `8h`), plus the user object without `passwordHash`.
- **Token payload:** `{ sub: userId, role }`.
- **authenticate middleware:** reads `Authorization: Bearer`, verifies, loads the user, rejects if missing or `isActive: false`. Attaches `req.user`.
- **authorize(...roles) middleware:** rejects with 403 if `req.user.role` is not in the list.
- **Bootstrap:** the seed script creates the first admin. There is no public sign-up. Admins create agents from the Users page.
- **Password rules:** minimum 8 characters, at least one letter and one number. Hash with bcrypt cost 12.
- **Rate limit:** login route allows 10 attempts per 15 minutes per IP.

**Permissions matrix:**

| Action | Admin | Agent |
|---|---|---|
| View tickets, dashboard, search | Yes | Yes |
| Create ticket | Yes | Yes |
| Change status, priority, tags | Yes | Yes |
| Assign to self | Yes | Yes |
| Assign to any agent | Yes | No |
| Bulk actions | Yes | Yes (only on tickets they can edit, which is all tickets) |
| Add internal notes and comments | Yes | Yes |
| Manage SLA policy | Yes | No |
| Manage users | Yes | No |
| Export CSV and SLA report | Yes | No |

---

## 7. API Specification

Base path: `/api`. All responses are JSON. Authenticated routes need the Bearer token.

### 7.1 Standard Response and Error Shape

Success: `{ "data": <payload> }` for single items, `{ "data": [...], "meta": { "page", "limit", "total", "totalPages" } }` for lists.

Error: `{ "error": { "code": "VALIDATION_ERROR", "message": "Human readable text", "details": [...] } }`

Status codes: 200 ok, 201 created, 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict (duplicate email), 429 rate limited, 500 server error (generic message, details logged server-side only).

### 7.2 Endpoints

**Auth**
- `POST /auth/login`: body `{ email, password }`
- `GET /auth/me`: current user

**Users (admin)**
- `GET /users`: list, optional `?role=agent`. Used for assignee dropdowns (agents can call it too, read-only)
- `POST /users`: body `{ name, email, password, role }`
- `PATCH /users/:id`: body `{ name?, role?, isActive?, password? }`

**Tickets**
- `GET /tickets`: query params below. Returns ticket list with `slaState` and `remainingMs` computed on each item.
  - `page` (default 1), `limit` (default 20, max 100)
  - `search`: text search, uses `$text`
  - `status`: comma list, e.g. `open,in_progress`
  - `priority`: comma list
  - `category`: comma list
  - `tag`: single tag
  - `assignedTo`: user id, or `me`, or `unassigned`
  - `slaState`: filter by computed state (`warning`, `breached`, `paused`, `normal`, `met`, `missed`). Computed in service after fetch, so pagination applies after filter: implement by fetching the filtered query, computing states, then filtering and paging in memory for this filter only, with a cap of 1000 candidate records
  - `sort`: one of `deadline` (default, nearest first, unresolved tickets first), `newest`, `priority`
- `POST /tickets`: body `{ title, description, priority, category, tags?, requester: { name, email? } }`
- `GET /tickets/:id`: ticket with computed SLA fields
- `PATCH /tickets/:id`: body `{ title?, description?, priority?, category?, tags? }`
- `PATCH /tickets/:id/status`: body `{ status }`
- `PATCH /tickets/:id/assign`: body `{ assigneeId }` where value may be a user id, `"self"`, or `null` (unassign)
- `POST /tickets/bulk`: body `{ ticketIds: [id...] (1 to 100), action, value? }`
  - `action` enum: `assign` (value = user id, `"self"`, or null), `status` (value = status), `close` (sets status `resolved`)
  - Process each ticket in its own transaction-free loop. Return `{ data: { updated: n, failed: [{ id, reason }] } }`. Partial success is allowed and reported.
- `DELETE /tickets/:id`: admin only. Soft delete is not required, hard delete is fine. Audit entry is still written with `details.ticketNumber`.

**Comments**
- `GET /tickets/:id/comments`: oldest first
- `POST /tickets/:id/comments`: body `{ body, isInternal }`

**Audit**
- `GET /tickets/:id/audit`: newest first

**SLA Policy**
- `GET /sla-policy`: active policy (any role can read, needed for displaying targets)
- `PUT /sla-policy` (admin): replaces the active policy. Validates all rules and targets. Writes `POLICY_UPDATED` audit entry.

**Reports (admin)**
- `GET /reports/summary`: JSON for dashboard. Returns:
  - `totals`: total, open, in_progress, pending, resolved
  - `byPriority`: counts per priority
  - `slaStates`: counts per computed state across open tickets
  - `compliance`: `met / (met + missed + breached)` as a percentage, over the last 30 days of resolved or responded tickets
  - `avgFirstResponseMinutes`: over the last 30 days
  - `dailyTrend`: last 14 days of created count and breached count
- `GET /reports/export.csv`: all tickets matching the same query filters as `GET /tickets`. Columns: ticketNumber, title, status, priority, category, tags, requester name, requester email, assignee name, createdAt, slaDeadline, firstResponseAt, slaState, escalationLevel, resolvedAt. Content-Type `text/csv`, Content-Disposition `attachment; filename="tickets-YYYY-MM-DD.csv"`.
- `GET /reports/sla.csv`: one row per ticket that has breached or missed, with columns ticketNumber, priority, targetMinutes, deadline, firstResponseAt, breachedAt, assignee.

**Health**
- `GET /health`: returns `{ status: 'ok', db: 'connected' | 'down' }`

---

## 8. Validation and Error Handling

- Every route has a Zod schema in `validators/`. The `validate` middleware parses `body`, `query`, and `params`, and replaces them with parsed values. Invalid input returns 400 with the Zod issues in `details`.
- Central error handler: converts `AppError` (with status and code), Mongoose `ValidationError` (400), duplicate key `11000` (409), `CastError` (400, "Invalid id"), JWT errors (401). Anything else returns 500 with a generic message. Stack traces go to the console only, never to the response (except when `NODE_ENV !== 'production'`, where stack is included in `details` for debugging).
- Unknown route: 404 JSON, not HTML.
- Use `express.json({ limit: '100kb' })`.
- Trim all strings. Reject empty strings after trimming.
- Sanitise search input: escape regex characters, or use `$text` only.

---

## 9. Frontend Specification

### 9.1 Design Direction (basic for this phase)

- Clean, minimal, professional. One neutral palette (white/grey background, dark text, one accent colour for actions).
- Sidebar navigation on desktop collapses to a top bar with a menu on screens under 768px.
- Use semantic colour only for SLA states: normal = green, warning = amber, breached = red, paused = grey-blue, met = green outline, missed = red outline.
- Font: system UI stack. No icon library required; use simple text labels or unicode symbols.
- Forms and tables should be obvious: labels above inputs, one primary button per screen.
- Do not add animations beyond a subtle hover state.

### 9.2 Pages

**Login:** email, password, error message on failure. Redirects to Dashboard on success.

**Dashboard (all roles):**
- Top row: stat cards for Open, In progress, Pending, Breached now, Warning now.
- Second row: compliance percentage card, average first response card.
- Chart: 14-day line or bar of created vs breached (Recharts).
- Priority breakdown: simple horizontal bars.
- "Needs attention" list: top 5 unresolved tickets by nearest deadline, each linking to the ticket.

**Tickets (all roles):**
- Header: search box, "New ticket" button, view toggle (Board / List), Export button (admin only).
- Filter bar: status, priority, category, assignee (Me / Unassigned / any agent), SLA state, tag input. Filters are reflected in the URL query string so refresh keeps them.
- Board view: four columns (Open, In progress, Pending, Resolved), cards sorted by nearest deadline. Each card shows ticket number, title, priority pill, SLA badge with countdown, assignee initials. Columns scroll independently.
- List view: table with checkbox column, ticket number, title, status, priority, SLA badge and countdown, assignee, deadline. Sortable by deadline (default), priority, newest.
- Bulk action bar appears when one or more tickets are selected: Assign to me, Assign to (admin only), Set status, Close. Shows result toast with success and failure counts.
- Polling: refetch the current list every 30 seconds, and pause polling while the tab is hidden.
- Countdown: uses `useNow()` ticking once per second. Countdown is computed from `slaDeadline` and a server time offset (`serverNow - clientNow` captured at each fetch) so client clock drift does not matter.

**New Ticket:** title, description, priority, category, tags (comma input), requester name and email. Shows the computed SLA target live, using the active policy, before submit.

**Ticket Detail:**
- Header: ticket number, title, status and priority pills, SLA badge with countdown, escalation flag if escalated.
- Left column: description, requester details, tags, editable status dropdown, priority dropdown, category dropdown, assignee control ("Assign to me" button for agents, dropdown for admins), Edit button.
- Right column: comment thread. Two modes: Public reply and Internal note (toggle with clear labels and a different background colour for internal notes).
- Bottom: audit timeline, newest first, with human readable text such as "Status changed from Open to In progress by Priya".

**SLA Policies (admin only):**
- Default targets form (four numeric inputs with units shown as hours or minutes).
- Warning threshold slider (50 to 95 percent).
- Rule builder: list of rules. Each rule row has name, condition selects (priority, category, tag), target minutes, enabled toggle, move up/down buttons, delete button. Button to add rule. Save button at bottom. A preview line explains the rule in plain English, for example "Urgent billing tickets get a 30 minute target."

**Users (admin only):** table of users, add user form (name, email, password, role), toggle active, change role.

**Not found page.**

### 9.3 Frontend Rules

- All API calls go through `api/http.js`. On 401, clear the session and redirect to login.
- Show a loading state for every list and detail page. Show an inline error with a retry button on failure. Never show a blank screen.
- Protect admin routes in the UI and also rely on the API for enforcement.
- No `localStorage` for anything other than the JWT.

---

## 10. Feature Mapping (all 20 required features)

| # | Feature | Where it is implemented |
|---|---|---|
| 1 | Configurable SLA response targets and rule builder | `SlaPolicy` model, `slaEngine.resolveTargetMinutes`, `PoliciesPage`, `RuleBuilder` |
| 2 | Dynamic ticket priority matrix (Low, Medium, High, Urgent) | `Ticket.priority`, default targets in policy, priority filter and pill |
| 3 | Real-time visual SLA countdown timers per ticket | `useNow` hook, `SlaCountdown` component, server time offset |
| 4 | Color-coded urgency badging (Normal, Warning, Breached) | `computeSlaState`, `SlaBadge` component |
| 5 | Automated ticket status pipeline (Open, In Progress, Pending, Resolved) | Status transition rules in `ticketService`, status dropdown, board columns |
| 6 | Smart queue sorting by nearest deadline | `GET /tickets?sort=deadline`, board card order, dashboard attention list |
| 7 | One-click ticket assignment and ownership tracking | `PATCH /tickets/:id/assign` with `self`, `assignedTo`, `assignedAt`, audit log |
| 8 | Automated escalation status flagging | Scheduler sets `escalationLevel`, escalation flag in UI |
| 9 | Visual SLA breach and compliance analytics dashboard | `GET /reports/summary`, `DashboardPage` |
| 10 | Interactive Kanban and list board toggle | `TicketsPage` view toggle, `TicketCard`, `TicketTable` |
| 11 | Instant search, category filters, tagging system | `$text` index, filter query params, `tags` field, `FilterBar` |
| 12 | Secure authentication and role-based access (Admin, Agent) | JWT, bcrypt, `authenticate`, `authorize`, permissions matrix |
| 13 | RESTful API backend with input validation and error handling | Zod validators, central error handler, standard response shape |
| 14 | MongoDB persistence with optimised schema indexing | Index list in section 4, verified with `explain()` during testing |
| 15 | Responsive mobile-friendly dashboard UI layout | CSS media queries, collapsing sidebar, responsive tables become card lists under 640px |
| 16 | Quick internal notes and comment threads on tickets | `Comment.isInternal`, `CommentThread` with mode toggle |
| 17 | Activity audit trail and ticket history log | `AuditLog` model, `auditService`, `AuditTimeline` |
| 18 | Bulk ticket actions (select, assign, or close multiple) | `POST /tickets/bulk`, `BulkActionBar` |
| 19 | Automated status badges for pending or paused SLA timers | `paused` state, `pausedSince` and deadline shifting, `SlaBadge` paused style |
| 20 | Export support logs and SLA reports to CSV | `reportService`, `utils/csv.js`, `GET /reports/export.csv` and `/reports/sla.csv` |

---

## 11. Configuration

### 11.1 Environment Variables (`server/.env`)

```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/supportsla
JWT_SECRET=change-this-to-a-long-random-string-at-least-32-chars
JWT_EXPIRES_IN=8h
CLIENT_ORIGIN=http://localhost:5173
SEED_ADMIN_EMAIL=admin@supportsla.local
SEED_ADMIN_PASSWORD=Admin12345
```

`env.js` validates these with Zod at startup and exits with a clear message if any required variable is missing or invalid.

### 11.2 Scripts

Server `package.json`:
- `dev`: `node --watch src/server.js`
- `start`: `node src/server.js`
- `seed`: `node src/seed/seed.js`
- `test`: `jest --runInBand`

Client `package.json`:
- `dev`: `vite`
- `build`: `vite build`
- `test`: `vitest run`

### 11.3 Seed Data

`seed.js` creates, idempotently (safe to run twice):
- 1 admin user from env, 3 agent users (`agent1@supportsla.local`, `agent2@...`, `agent3@...`, password `Agent12345`)
- 1 active SLA policy with default targets
- 30 sample tickets spread across all statuses, priorities, categories, with some tags, some with `firstResponseAt` set, some past deadline, and some paused, so every dashboard state is visible on first run.

---

## 12. Non-Functional Requirements

- **Performance:** list endpoint responds under 300 ms with 5,000 tickets in the database. Indexes must cover every filter.
- **Reliability:** no unhandled promise rejections. The server keeps running if the scheduler fails. Every write that changes state also writes an audit entry.
- **Security:** Helmet enabled, CORS restricted to `CLIENT_ORIGIN`, passwords never returned, JWT secret required, rate limit on login, no stack traces in production responses, Mongo query operators are not passed through from user input (Zod validation prevents this).
- **Accessibility:** all form inputs have labels, all interactive elements are keyboard reachable, colour is never the only signal (SLA badges include text).
- **Time handling:** all timestamps stored in UTC. The UI displays local time. Countdown never shows negative numbers; it shows "Breached by 2h 10m" instead.
- **Browser support:** latest two versions of Chrome, Edge, Firefox, Safari.

---

## 13. Testing Requirements

Backend tests use `mongodb-memory-server`, so no real database is needed to run tests.

Required test coverage:
- `slaEngine.test.js`: every state (normal, warning, breached, paused, met, missed, closed), rule matching order, default fallback, deadline shift on pause and resume, percent clamp.
- `auth.test.js`: login success and failure, token required, expired token rejected, deactivated user rejected, agent cannot hit admin routes.
- `tickets.test.js`: create, validation errors, status transitions, pause and resume, assign self, first response timestamp, search, filters, sort by deadline, pagination.
- `bulk.test.js`: bulk assign, bulk status, bulk close, partial failure reporting.
- `policies.test.js`: get and put policy, invalid rule rejected, non-admin rejected.
- `reports.test.js`: summary numbers match seeded data, CSV headers and escaping (commas, quotes, and newlines in titles), breach scheduler is idempotent.

Frontend tests: smoke tests that the login page renders, the tickets page renders a list from a mocked API, and the SLA badge shows the correct label for each state.

**Manual acceptance checklist** (must pass before the build is considered done):
1. Log in as admin and as agent. Agent cannot see the Policies or Users pages and gets 403 from the API if forced.
2. Create a ticket. It gets a ticket number, a deadline, and a Normal badge.
3. Wait or adjust time in a test to reach the warning threshold. Badge turns amber.
4. Past the deadline, badge turns red, escalation flag appears, and an `SLA_BREACHED` audit entry exists exactly once.
5. Set a ticket to Pending. Badge shows Paused, countdown stops, deadline shifts after resume.
6. Post a public reply as an agent. `firstResponseAt` is set and the badge shows Met or Missed.
7. Post an internal note. It shows with the internal badge and does not appear as a public reply.
8. Search by ticket number and by title words. Filters combine correctly and survive a page refresh.
9. Toggle Board and List. Both show the same tickets in the same deadline order.
10. Select three tickets, bulk assign to self, then bulk close. Toast shows counts.
11. Export tickets CSV and SLA CSV. Open both in a spreadsheet and check that commas in titles display correctly.
12. Dashboard numbers match the database counts.
13. Resize the browser to 375px wide. Every page is usable and nothing overflows horizontally.
14. Stop MongoDB, then use the app. The UI shows a clear error message, not a blank screen, and the server does not crash. Restart MongoDB and it recovers.
15. Check the server console during the whole run. No unhandled errors appear.

---

## 14. Build Phases (order of work)

1. **Foundation:** repo structure, server boot, env validation, DB connection, health route, error handler, Zod validate middleware, seed script skeleton.
2. **Auth and users:** User model, login, JWT middleware, role middleware, user management endpoints, tests.
3. **Tickets core:** Ticket and Counter models, create, list, get, update, status transitions, assign, indexes, tests.
4. **SLA engine:** policy model and endpoints, `slaEngine.js` pure functions and unit tests, pause and resume logic, first response logic, scheduler, tests.
5. **Collaboration:** comments (public and internal), audit model and service, audit endpoint, bulk actions, tests.
6. **Reports and CSV:** summary endpoint, export endpoints, CSV escaping, tests.
7. **Frontend foundation:** Vite app, API client, auth context, routing, login page, app shell.
8. **Frontend tickets:** list, board, toggle, filters, search, bulk bar, polling, countdown, new ticket page.
9. **Frontend detail:** ticket detail, status and assignment controls, comments, audit timeline.
10. **Frontend admin and dashboard:** dashboard charts, policy builder, users page, export buttons.
11. **Hardening:** responsive pass, error states, loading states, acceptance checklist, final README.

Each phase must end with passing tests before the next phase starts.
