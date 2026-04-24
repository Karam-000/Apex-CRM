# Apex CRM Feature Guide

This guide covers the advanced features of Apex CRM, including bulk operations, data protection, and analytics.

## 1. Bulk Upload (CSV Import)

Apex CRM supports bulk importing of Contacts, Deals, and Agents using CSV files.

### How to Use
1.  **Get a Template**: Download the CSV template for the entity you want to import.
    *   `GET /api/bulk/templates/contacts`
    *   `GET /api/bulk/templates/deals`
    *   `GET /api/bulk/templates/agents`
2.  **Fill the Data**: Add your records to the CSV following the headers in the template.
3.  **Upload**: Send the CSV file to the bulk upload endpoint.
    *   `POST /api/bulk/upload/{entity}`
    *   Required Role: `admin` or `supervisor`.

### Example (cURL)
```bash
curl -X POST "http://127.0.0.1:8000/api/bulk/upload/contacts" \
  -H "Authorization: Bearer admin-dev-token" \
  -F "file=@my_contacts.csv"
```

---

## 2. Backup and Restore

Data safety is handled through a SQLite-based backup system.

### Manual Backup
Trigger an immediate snapshot of the database.
*   `POST /api/admin/backups/manual`
*   Backups are stored in the `backups/` directory.

### Monthly Automatic Backup
The system is configured to automatically perform a backup on the 1st of every month at midnight.
*   **Logic**: A background task runs on the server, checking the date every 24 hours.
*   **Manual Trigger**: `POST /api/admin/backups/monthly`

### Restore
To restore the database to a previous state:
*   `POST /api/admin/backups/restore?file_path=backups/manual_crm_20260424_080000.db`
*   **Warning**: This will overwrite the current database and restart the engine.

---

## 3. Analytics and Reports

Apex CRM provides comprehensive reporting across sales, support, and marketing.

### Core Reports
- **Pipeline Forecast**: Predict future revenue based on stage win rates.
  *   `GET /api/reports/pipeline-forecast`
- **Funnel Analytics**: Visualize lead conversion through pipeline stages.
  *   `GET /api/reports/funnel`
- **SLA Tracking**: Monitor support ticket response and resolution times.
  *   `GET /api/reports/sla`
- **Activity Summary**: Breakdown of calls, meetings, and tasks.
  *   `GET /api/reports/activity`

### Global Overview
The `analytics-overview` endpoint provides a consolidated view of all key metrics:
*   `GET /api/reports/analytics-overview`

---

## 4. CRM Connectors

Connect Apex CRM to external software via webhooks and signed payloads.

### Outbound (Push)
Push CRM records to external APIs (e.g., Slack, Mailchimp).
- Supports HMAC signing (`X-CRM-Signature`) for security.
- Endpoints: `POST /api/connectors/{id}/push/{entity}/{entity_id}`

### Inbound (Ingest)
Receive data from external systems into the CRM.
- Endpoint: `POST /api/connectors/inbound/{system_type}`
- Supports `contact` and `ticket` entity types.

See [CONNECTORS.md](./CONNECTORS.md) for full technical details.
