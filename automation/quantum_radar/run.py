"""Dry-run entry point for Quantum Radar collection."""

from __future__ import annotations

import argparse
import json

from openalex import as_rows, search_works


def main() -> int:
    parser = argparse.ArgumentParser(description="Quantum Radar collection dry-run")
    parser.add_argument("--query", default="quantum computing")
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--live", action="store_true", help="call OpenAlex; omitted by default")
    args = parser.parse_args()
    if not args.live:
        print(json.dumps({"mode": "dry-run", "query": args.query, "records": [], "persisted": False}, ensure_ascii=False, indent=2))
        return 0
    rows = search_works(args.query, limit=args.limit)
    print(json.dumps({"mode": "live-read-only", "query": args.query, "records": as_rows(rows), "persisted": False}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
