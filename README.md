# Apex CRM — Modern, AI-Assisted, Local-First CRM

<div align="center">
  <img src="docs/logo.png" alt="Apex CRM Logo" width="180"/>
  <p><em>Sales, Marketing, and Customer Success platform — without the LLM complexity.</em></p>
  <p><strong>Version 2.0.0</strong></p>
</div>

---

## ✨ What's new in Apex CRM v2

- **New modules & navigation**: **Leads** (early-stage contacts with deterministic lead scoring), **Pipeline** (kanban board of open deals by stage), and **Campaigns** (full CRUD marketing campaigns).
- **Material 3 redesign**: complete React + Tailwind interface — dark sidebar, Material surface palette, metric-dense executive **Dashboard**, redesigned tables, modals, and login.
- **bcrypt password security**: salted bcrypt hashing with automatic upgrade of any legacy hashes on login.
- **Secured connectors**: every connector gets an auto-generated API key you can reveal, copy, **regenerate**, or delete from the UI; connectors are fully editable/deletable.
- **Full edit & delete**: contacts, deals, tickets, invoices, workflows, campaigns, and connectors are all editable and deletable (with role-based scoping).
- **Single-server delivery**: FastAPI serves the built React app — one process, one URL, no separate frontend server needed.
- **Automatic monthly backups** saved to the `backups/` directory, plus one-click manual backup/restore.

---

## 🚀 Key Features

### 📊 Revenue Intelligence & Reports
- **Pipeline Forecasting** based on stage win rates.
- **Funnel Analysis** to identify bottlenecks.
- **Channel Analytics** across Email, WhatsApp, SMS, and more.
- **SLA Tracking** for support teams.

### 📥 Bulk Operations
- **CSV Import** with downloadable templates for Contacts, Deals, and Agents.
- **Per-row validation** — bad rows are reported, good rows still import.

### 🛡️ Data Protection & Backups
- **Manual snapshots** and **automatic monthly backups** to `backups/`.
- **One-click restore** (path-validated to the backups directory).

### 🔗 CRM Connectors
- **Omnichannel integration** with Slack, Mailchimp, Stripe, and custom webhooks.
- **Outbound webhooks** with HMAC-signed payloads and a per-connector API key.
- **Inbound ingestion** to create records from external events.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.13, FastAPI, SQLAlchemy 2.0, SQLite
- **Frontend**: React 18, Vite, Tailwind CSS (Material 3 tokens), Recharts, lucide-react
- **Security**: bcrypt password hashing, Bearer API tokens, RBAC (Admin, Supervisor, Agent)

---

## 📂 Documentation

- [Architecture Guide](docs/ARCHITECTURE.md) — System design and data strategy.
- [Feature Guide](docs/FEATURES.md) — Bulk upload, backups, reports.
- [Connectors Guide](docs/CONNECTORS.md) — External integrations and API keys.
- [System Specs & Limits](docs/SPECIFICATIONS.md) — Requirements and boundaries.

---

## 🏁 Quick Start (single server)

```bash
# 1. Backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 2. Build the frontend (served by the backend)
cd frontend && npm install && npm run build && cd ..

# 3. Run — serves the API and the app on one URL
uvicorn app.main:app --reload      # http://localhost:8000
```

The database is created and seeded automatically on first startup.

> For frontend hot-reload during development, run `npm run dev` in `frontend/`
> (Vite proxies `/api` to the backend on port 8000).

### Demo Access

Sign in on the login page with email + password:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@apex.com` | `apex123` |
| Supervisor | `supervisor@apex.com` | `apex123` |
| Agent | `agent@apex.com` | `apex123` |

Login returns a Bearer token (format `{role}-{user_id}-token`) used for API calls,
e.g. `Authorization: Bearer admin-1-token`.

---

<div align="center">
  <p>© 2026 Apex CRM Team · v2.0.0</p>
</div>
