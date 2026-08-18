"""Explicitly gated Supabase writer for reviewed Quantum Radar leads."""

from __future__ import annotations

import json
import os
from urllib.parse import urljoin
from urllib.request import Request, urlopen


def write_talent_leads(rows: list[dict], *, base_url: str | None = None, service_role_key: str | None = None, opener=urlopen) -> int:
    url = (base_url or os.environ.get("SUPABASE_URL", "")).rstrip("/")
    key = service_role_key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise RuntimeError("SUPABASE_CREDENTIALS_REQUIRED")
    if not rows:
        return 0
    payload = []
    for row in rows:
        payload.append({
            "id": row["id"],
            "workspace_id": "main",
            "name": row.get("name", ""),
            "institution": row.get("institution", ""),
            "research_direction": row.get("research_direction", ""),
            "matched_jobs": row.get("matched_jobs", []),
            "stage": row.get("stage", "线索观察"),
            "source": row.get("source", "OpenAlex"),
        })
    request = Request(
        urljoin(url + "/", "rest/v1/talent_leads?on_conflict=id"),
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        method="POST",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )
    with opener(request, timeout=30) as response:
        response.read()
    return len(payload)
