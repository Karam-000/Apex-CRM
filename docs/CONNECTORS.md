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

- `POST /api/connectors`: create connector (auto-generates an `api_key` if none is supplied)
- `GET /api/connectors`: list connectors
- `PUT /api/connectors/{id}`: edit a connector
- `DELETE /api/connectors/{id}`: delete a connector (also removes its sync logs)
- `POST /api/connectors/{id}/regenerate-key`: rotate the connector API key
- `DELETE /api/connectors/{id}/key`: remove the connector API key
- `POST /api/connectors/{id}/test?dry_run=true|false`: validate connector
- `POST /api/connectors/{id}/push/contact/{contact_id}?dry_run=true|false`
- `POST /api/connectors/{id}/push/deal/{deal_id}?dry_run=true|false`
- `POST /api/connectors/inbound/{system_type}`: ingest external payload
- `GET /api/connectors/logs`: inspect sync logs

All connector endpoints require Bearer token authentication.
Create/edit/delete/test/key-management require role `admin`; push operations allow `admin` or `supervisor`.

### API key management (v2)

Each connector is issued a generated API key (prefix `apex_`) on creation. Admins can
reveal, copy, **regenerate**, or delete the key from the Connectors page. The key is used
as the `Authorization: Bearer` value on outbound pushes to the external system.

## Example Outbound Push (Dry Run)

```bash
curl -X POST "http://127.0.0.1:8000/api/connectors/1/push/contact/1?dry_run=true" ^
  -H "Authorization: Bearer admin-1-token"
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
  -H "Authorization: Bearer admin-1-token" ^
  -H "Content-Type: application/json" ^
  -d "{\"entity_type\":\"contact\",\"entity\":{\"first_name\":\"External\",\"last_name\":\"Lead\"}}"
```

## Security

- Use HTTPS endpoint URLs
- Use `api_key` for authorization headers
- Use `outbound_secret` for HMAC signature (`X-CRM-Signature`)
- Restrict inbound endpoint at gateway/firewall level in production
