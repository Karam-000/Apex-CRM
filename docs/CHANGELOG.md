# Apex CRM — Changelog & Roadmap

This document tracks what shipped in each version and what is planned next.

---

## ✅ v2.0.0 — Shipped

**Security**
- Passwords hashed with **bcrypt** (salted), with automatic upgrade of legacy SHA-256 hashes on login.
- Login route made public; all other API routes require a Bearer token.

**Connectors / integrations**
- Auto-generated **API key** per connector with reveal / copy / **regenerate** / delete.
- Connectors fully editable and deletable (cascades sync logs).
- Outbound push (dry-run + live, HMAC signing) and inbound ingestion.

**Data management**
- Full **edit & delete** for contacts, deals, tickets, invoices, workflows, campaigns, connectors (role-scoped).
- Bulk CSV import with **per-row validation** (`created_count` / `error_count` / `errors`).
- Automatic **monthly backups** to `backups/` + manual backup and path-validated restore.

**New modules & navigation**
- **Leads** (early-stage contacts + deterministic lead scoring), **Pipeline** (kanban of open deals by stage), **Campaigns** (CRUD).

**Platform / UX**
- Single-server delivery: FastAPI serves the built React app (one process, one URL).
- Complete **Material 3 redesign** (dark sidebar, surface palette, executive dashboard, redesigned tables/modals/login).
- Logo used in sidebar, login, and docs.

---

## 🚧 v3.0.0 — In progress

| Area | Goal | Status |
| --- | --- | --- |
| **Authentication** | Real **JWT** access tokens — signed (HS256), expiring (`JWT_EXPIRE_MINUTES`), with `/auth/refresh`; legacy/static tokens still accepted as a fallback. Frontend auto-logs-out on 401. | ✅ Shipped |
| **Email** | Simple **SMTP** sending with credentials in `.env`; send + log to the contact timeline (Compose Email). | ✅ Shipped |
| **Pipeline** | **Drag-and-drop** kanban that persists stage changes via `PUT /deals/{id}`. | ✅ Shipped |
| **Reporting** | **Export to CSV** from the Reports page (was an inert button). | ✅ Shipped |
| **Campaigns** | **Campaigns send email** to their audience (`POST /campaigns/{id}/send`, team-scoped); **bulk CSV broadcast** (`POST /campaigns/broadcast`) with `{{name}}` personalization and a downloadable sample CSV. | ✅ Shipped |
| **Quote → Order → Invoice** | **Products** catalog, **Quotes** with line items + tax, **convert** quote → order → invoice, and **PDF** for quotes & invoices. | ✅ Shipped |
| **Email/Calendar (more)** | Email templates, reply logging, calendar/meetings, reminders. | ⏳ Planned |
| **Quote/Order (more)** | Price lists, multi-currency, dedicated Orders UI, deposits/partial invoicing. | ⏳ Planned |
| **Pipeline (more)** | Deal aging/rotting indicators; record moves in `DealStageHistory`. | ⏳ Planned |
| **Reporting (more)** | Pivot-style reports, configurable dashboards, XLSX/PDF export. | ⏳ Planned |
| **Automation** | Run workflow rules **automatically on events** + scheduled actions (currently triggered manually only). | ⏳ Planned |

### Authentication (JWT) — how it works
- `POST /api/auth/login` verifies the bcrypt password and returns a **signed JWT** (`sub`, `role`, `team_id`, `jti`, `exp`).
- `require_auth` validates the JWT signature/expiry; an expired token returns `401 Token expired`.
- `POST /api/auth/refresh` exchanges a still-valid token for a fresh one (sliding session).
- Set **`JWT_SECRET`** (and optionally `JWT_EXPIRE_MINUTES`) in `.env`. A static API token (e.g. a connector key) is still accepted via the legacy lookup path.

### Email (SMTP) — how to use
1. Copy `.env.example` to `.env` and fill in `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_USE_TLS`.
2. Restart the server. On the **Contacts** page click **Compose Email**, pick a recipient, write a subject/body, and send.
3. Each send is recorded as an outbound `email` message on the contact's timeline with status `sent`, `failed`, or `dry_run`.
4. If SMTP is not configured, sends are logged as `dry_run` (not delivered) so local development still works.

API: `POST /api/email/send` `{ "contact_id", "to"?, "subject", "body" }`.

---

## 🔮 v4.0.0 — Planned

**Platform foundations**
- **Refresh-token rotation**, password reset, server-side token revocation, login rate-limiting, finer-grained permissions (beyond the 3 roles). *(JWT access tokens shipped in v3.)*
- **PostgreSQL** + **Alembic** migrations (replace `create_all`), Docker Compose, env-based config, CI + test suite.
- **Pagination, filtering, sorting** on all list endpoints; wire the global **search** bar.

**Experience**
- **Real-time notifications** (websocket/poll) so the bell, SLA breaches, and approvals are live.
- **Attachments / documents** on records; customer portal.

**Intelligence (make "AI-assisted" real)**
- Either a **trained model** (scikit-learn logistic regression on won/lost history, refreshed nightly) replacing the hand-set deal-risk weights, **or**
- **LLM assist (Claude)**: draft follow-up emails, summarize a contact timeline, next-best-action with reasoning, natural-language → report queries.
