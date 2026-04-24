# Apex CRM - Modern, AI-Powered, Local-First CRM

<div align="center">
  <img src="docs/logo.png" alt="Apex CRM Logo" width="250"/>
  <p><em>Sales, Marketing, and Customer Success platform without the LLM complexity.</em></p>
</div>

---

## 🚀 Key Features

### 📊 Revenue Intelligence & Reports
- **Pipeline Forecasting**: Automated revenue predictions based on historical win rates.
- **Funnel Analysis**: Identify bottlenecks in your sales process.
- **Channel Analytics**: Track response rates across Email, WhatsApp, and more.
- **SLA Tracking**: Built-in resolution monitoring for support teams.

### 📥 Bulk Operations
- **CSV Import/Export**: Quickly migrate data using standard templates for Contacts, Deals, and Users.
- **Bulk Upload API**: Programmatic data ingestion for large datasets.

### 🛡️ Data Protection & Backups
- **Manual Snapshots**: Create database backups with a single click or API call.
- **Automatic Monthly Backups**: Built-in background task for recurring data safety.
- **One-Click Restore**: Easily roll back to any previous state.

### 🔗 CRM Connectors
- **Omnichannel Integration**: Connect with Slack, Mailchimp, Stripe, and custom software.
- **Outbound Webhooks**: Secure HMAC-signed push notifications.
- **Inbound Ingestion**: Automatic record creation from external events.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.13, FastAPI, SQLAlchemy, SQLite
- **Frontend**: React 18, Vite, Tailwind CSS, Recharts
- **Security**: Bearer Token Auth, RBAC (Admin, Supervisor, Agent)

---

## 📂 Documentation

- [Architecture Guide](docs/ARCHITECTURE.md) - System design and data strategy.
- [Feature Guide](docs/FEATURES.md) - How to use Bulk Upload, Backup, and Reports.
- [Connectors Guide](docs/CONNECTORS.md) - Technical specs for external integrations.
- [System Specs & Limits](docs/SPECIFICATIONS.md) - Requirements and software boundaries.

---

## 🏁 Quick Start

### 1. Backend Setup
```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Demo Access
Use these pre-seeded tokens for API access:
- **Admin**: `admin-dev-token`
- **Supervisor**: `supervisor-dev-token`

---

## 🧪 Development

Run the smoke test to verify all systems are operational:
```bash
python scripts/smoke_test.py
```

---

<div align="center">
  <p>© 2026 Apex CRM Team. Built for speed and reliability.</p>
</div>
