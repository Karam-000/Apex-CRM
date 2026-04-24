# Apex CRM Connector Guide

## Purpose

Connect the CRM with other software systems (ERP, ticketing, marketing automation, custom apps) without proprietary AI services.

## Connector Model

Each connector stores:

- `name`
- `system_type`
- `base_url`
- `api_key` (optional bearer token)
- `outbound_secret` (optional HMAC signing secret)
- `mapping_json`
- `is_active`

Sync history is tracked in `connector_sync_logs`.

## API Endpoints

- `POST /api/connectors`: create connector
- `GET /api/connectors`: list connectors
- `POST /api/connectors/{id}/test?dry_run=true|false`: validate connector
- `POST /api/connectors/{id}/push/contact/{contact_id}?dry_run=true|false`
- `POST /api/connectors/{id}/push/deal/{deal_id}?dry_run=true|false`
- `POST /api/connectors/inbound/{system_type}`: ingest external payload
- `GET /api/connectors/logs`: inspect sync logs

All connector endpoints require Bearer token authentication.
Recommended role for connector operations: `admin` (or `supervisor` for push-only operations, depending on policy).

## Example Outbound Push (Dry Run)

```bash
curl -X POST "http://127.0.0.1:8000/api/connectors/1/push/contact/1?dry_run=true" ^
  -H "Authorization: Bearer admin-dev-token"
```

## Example Inbound Payload

```json
{
  "entity_type": "contact",
  "entity": {
    "account_id": 1,
    "first_name": "External",
    "last_name": "Lead",
    "email": "external@example.com",
    "phone": "+155500000"
  }
}
```

Send it to:

```bash
curl -X POST "http://127.0.0.1:8000/api/connectors/inbound/erp_system" ^
  -H "Authorization: Bearer admin-dev-token" ^
  -H "Content-Type: application/json" ^
  -d "{\"entity_type\":\"contact\",\"entity\":{\"first_name\":\"External\",\"last_name\":\"Lead\"}}"
```

## Security

- Use HTTPS endpoint URLs
- Use `api_key` for authorization headers
- Use `outbound_secret` for HMAC signature (`X-CRM-Signature`)
- Restrict inbound endpoint at gateway/firewall level in production
