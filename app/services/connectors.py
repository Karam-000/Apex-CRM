from __future__ import annotations

import hashlib
import hmac
import json
from urllib.error import URLError
from urllib.request import Request, urlopen


def build_signature(secret: str, payload: dict) -> str:
    body = json.dumps(payload, sort_keys=True).encode("utf-8")
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def send_json(
    *,
    url: str,
    payload: dict,
    api_key: str | None = None,
    signature: str | None = None,
    timeout_sec: int = 8,
) -> dict:
    body = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    if signature:
        headers["X-CRM-Signature"] = signature
    request = Request(url=url, method="POST", data=body, headers=headers)
    try:
        with urlopen(request, timeout=timeout_sec) as response:
            raw = response.read().decode("utf-8")
            content = raw if raw else "{}"
            return {"ok": True, "status_code": response.status, "response": json.loads(content)}
    except URLError as exc:
        return {"ok": False, "status_code": 0, "error": str(exc)}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "status_code": 0, "error": str(exc)}
