import sys
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.main import app


def run() -> None:
    client = TestClient(app)
    headers = {"Authorization": "Bearer admin-dev-token"}

    health = client.get("/health")
    assert health.status_code == 200

    account = client.post("/api/accounts", json={"name": "Smoke Account"}, headers=headers).json()
    contact = client.post(
        "/api/contacts",
        json={
            "account_id": account["id"],
            "first_name": "Nour",
            "last_name": "Hassan",
            "email": "nour@example.local",
            "job_title": "Head of Sales",
            "lifecycle_stage": "mql",
        },
        headers=headers,
    ).json()
    deal = client.post(
        "/api/deals",
        json={"account_id": account["id"], "primary_contact_id": contact["id"], "amount": 42000, "stage_id": 2},
        headers=headers,
    ).json()

    consent = client.post(
        "/api/consents",
        json={"contact_id": contact["id"], "channel": "email", "status": "granted", "source": "smoke"},
        headers=headers,
    )
    assert consent.status_code == 200

    message = client.post(
        "/api/messages",
        json={
            "contact_id": contact["id"],
            "account_id": account["id"],
            "channel": "email",
            "direction": "outbound",
            "provider_message_id": f"smoke-{contact['id']}",
            "content_text": "hello",
        },
        headers=headers,
    )
    assert message.status_code == 200

    ticket = client.post(
        "/api/tickets",
        json={"contact_id": contact["id"], "account_id": account["id"], "subject": "Need support", "priority": "high"},
        headers=headers,
    ).json()
    sla = client.get(f"/api/tickets/{ticket['id']}/sla", headers=headers)
    assert sla.status_code == 200

    lead_score = client.get(f"/api/scores/lead/{contact['id']}", headers=headers)
    assert lead_score.status_code == 200
    deal_risk = client.get(f"/api/scores/deal-risk/{deal['id']}", headers=headers)
    assert deal_risk.status_code == 200
    health_score = client.get(f"/api/scores/health/{account['id']}", headers=headers)
    assert health_score.status_code == 200
    churn_score = client.get(f"/api/scores/churn/{account['id']}", headers=headers)
    assert churn_score.status_code == 200

    connector = client.post(
        "/api/connectors",
        json={"name": "Webhook Connector", "system_type": "generic_webhook", "base_url": "https://example.com/webhook"},
        headers=headers,
    ).json()
    connector_test = client.post(f"/api/connectors/{connector['id']}/test?dry_run=true", headers=headers)
    assert connector_test.status_code == 200
    push_contact = client.post(f"/api/connectors/{connector['id']}/push/contact/{contact['id']}?dry_run=true", headers=headers)
    assert push_contact.status_code == 200

    report_checks = [
        "/api/reports/pipeline-forecast",
        "/api/reports/funnel",
        "/api/reports/bottlenecks",
        "/api/reports/channels",
        "/api/reports/sla",
        "/api/reports/activity",
        "/api/reports/health-distribution",
        "/api/reports/analytics-overview",
    ]
    for endpoint in report_checks:
        response = client.get(endpoint, headers=headers)
        assert response.status_code == 200, endpoint

    print("Smoke tests passed.")


if __name__ == "__main__":
    run()
