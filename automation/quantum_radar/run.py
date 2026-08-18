"""Dry-run entry point for Quantum Radar collection."""

from __future__ import annotations

import argparse
import json
import os

from openalex import as_rows, search_works
from supabase_writer import write_talent_leads


def main() -> int:
    parser = argparse.ArgumentParser(description="Quantum Radar collection dry-run")
    parser.add_argument("--query", default="quantum computing")
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--live", action="store_true", help="call OpenAlex; omitted by default")
    parser.add_argument("--persist", action="store_true", help="write reviewed rows to Supabase")
    parser.add_argument("--confirm", action="store_true", help="required together with --persist")
    args = parser.parse_args()
    if args.persist and not args.confirm:
        parser.error("--persist requires --confirm")
    if not args.live:
        print(json.dumps({"mode": "dry-run", "query": args.query, "records": [], "persisted": False}, ensure_ascii=False, indent=2))
        return 0
    rows = search_works(args.query, limit=args.limit)
    records = as_rows(rows)
    persisted = False
    if args.persist:
        persisted = write_talent_leads(records, base_url=os.environ.get("SUPABASE_URL"), service_role_key=os.environ.get("SUPABASE_SERVICE_ROLE_KEY")) > 0
    print(json.dumps({"mode": "live-write" if persisted else "live-read-only", "query": args.query, "records": records, "persisted": persisted}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
