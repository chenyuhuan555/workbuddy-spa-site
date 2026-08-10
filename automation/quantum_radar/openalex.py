"""OpenAlex connector for the Quantum Radar Sprint 3 dry-run.

The connector is intentionally side-effect free: it only returns normalized
records. Persistence into Supabase belongs to a later, explicitly enabled step.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from urllib.parse import urlencode
from urllib.request import Request, urlopen


@dataclass(frozen=True)
class ResearchLead:
    id: str
    name: str
    institution: str
    research_direction: str
    source: str = "OpenAlex"


def normalize_work(work: dict) -> ResearchLead | None:
    authorships = work.get("authorships") or []
    author = next((item.get("author") for item in authorships if item.get("author")), None)
    if not author or not author.get("display_name"):
        return None
    institutions = (authorships[0].get("institutions") or []) if authorships else []
    institution = institutions[0].get("display_name", "") if institutions else ""
    concepts = [item.get("display_name", "") for item in (work.get("concepts") or [])]
    direction = " / ".join(item for item in concepts[:3] if item) or "量子信息"
    return ResearchLead(
        id=f"openalex:{author.get('id', author['display_name'])}",
        name=author["display_name"],
        institution=institution,
        research_direction=direction,
    )


def search_works(query: str, *, mailto: str | None = None, limit: int = 10, opener=urlopen) -> list[ResearchLead]:
    params = {"search": query, "per-page": str(max(1, min(limit, 50)))}
    if mailto:
        params["mailto"] = mailto
    request = Request(
        "https://api.openalex.org/works?" + urlencode(params),
        headers={"Accept": "application/json", "User-Agent": "WorkBuddy-QuantumRadar/1.0"},
    )
    with opener(request, timeout=20) as response:
        payload = json.load(response)
    result: list[ResearchLead] = []
    seen: set[str] = set()
    for work in payload.get("results", []):
        lead = normalize_work(work)
        if lead and lead.id not in seen:
            seen.add(lead.id)
            result.append(lead)
    return result


def as_rows(leads: list[ResearchLead]) -> list[dict]:
    return [asdict(lead) for lead in leads]
