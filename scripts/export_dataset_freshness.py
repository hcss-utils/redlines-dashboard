#!/usr/bin/env python3
"""Export per-dataset freshness snapshot to dataset_freshness.json.

Queries war_datasets (and redlines) DBs for MAX(date) + row count per table
the analytics consumes. Light query — runs in the VPS daily pipeline AND
locally via update_redlines_analytics.sh.

Output schema (one row per dataset):
  {
    "dataset":           "ACLED events",
    "schema_table":      "conflict_events.acled_events",
    "category":          "conflict",
    "latest_date":       "2025-05-28",          # ISO date string
    "rows":              327512,
    "expected_cadence":  "daily" | "weekly" | "monthly" | "quarterly" | "annual" | "manual",
    "expected_max_lag_days": 2,                 # warn threshold; null = manual
    "days_behind":       365,                   # latest_date vs as_of_utc
    "status":            "fresh" | "lagging" | "stale" | "annual_ok" | "very_stale",
    "note":              "Free tier: 12-month rolling window — expected"
  }

Top-level wraps:
  {"as_of_utc": "...", "rows": [...], "totals": {"fresh": N, "stale": M, ...}}
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import psycopg2

DB_HOST = os.environ.get("DB_HOST", "138.201.62.161")
DB_PORT = int(os.environ.get("DB_PORT", "5432"))
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASSWORD = os.environ["DB_PASSWORD"]

OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "dataset_freshness.json"
OUT.parent.mkdir(parents=True, exist_ok=True)

# Per-dataset config: (dataset_name, "schema.table", date_sql_expr, category,
#                     expected_cadence, expected_max_lag_days, note)
# date_sql_expr is a SQL fragment that produces a single max-date DATE value.
# Use NULL for tables without a useful per-row date.
DATASETS = [
    # ── war_datasets DB ─────────────────────────────────────────────────────
    ("Personnel daily (Ukraine MOD)", "equipment_losses.personnel_daily",
     "MAX(date)", "equipment_losses", "daily", 2,
     "GitHub JSON refresh; truncate+insert"),
    ("Equipment daily (Ukraine MOD)", "equipment_losses.equipment_daily",
     "MAX(date)", "equipment_losses", "daily", 2,
     "GitHub JSON refresh; truncate+insert"),
    ("ACLED events", "conflict_events.acled_events",
     "MAX(event_date)::date", "conflict_events", "daily", 400,
     "Free tier: 12-month rolling window — ~1y stale is expected"),
    ("VIINA events", "conflict_events.viina_events",
     "MAX(to_date(date::text,'YYYYMMDD'))", "conflict_events", "daily", 2,
     "GitHub ZIP refresh"),
    ("VIINA control", "conflict_events.viina_control",
     "MAX(to_date(date::text,'YYYYMMDD'))", "conflict_events", "daily", 7,
     "Daily territorial control snapshots"),
    ("ISW events", "isw.events",
     "MAX(event_date)", "conflict_events", "daily", 14,
     "Stale >15mo as of 2026-05 — needs investigation"),
    ("Bellingcat harm", "conflict_events.bellingcat_harm",
     "MAX(date)", "conflict_events", "monthly", 60,
     "Bellingcat civilian-harm dataset"),
    ("Missile attacks", "aerial_assaults.missile_attacks",
     "MAX(time_start::date)", "aerial_assaults", "daily", 7,
     "Kaggle-backed; truncate+insert"),
    ("GDELT events", "global_events.gdelt_events",
     "MAX(to_date(sqldate::text,'YYYYMMDD'))", "global_events", "daily", 2,
     "GDELT publishes T-1 daily"),
    ("GDELT GKG coercive quotations", "global_events.gdelt_gkg_coercive_quotations",
     "MAX(to_date(substring(date::text,1,8),'YYYYMMDD'))", "global_events", "daily", 2,
     "GKG quotations corpus (coercion subset)"),
    ("GDELT GKG redline quotations", "global_events.gdelt_gkg_redline_quotations",
     "MAX(to_date(substring(date::text,1,8),'YYYYMMDD'))", "global_events", "daily", 2,
     "GKG quotations corpus (red-line subset)"),
    ("GDELT weekly VARX", "global_events.gdelt_weekly_varx",
     "MAX(week)", "global_events", "weekly", 8,
     "Recomputed Monday 08:00 UTC from coercive quotes"),
    ("CREA Russia fossil exports", "economic_data.crea_russia_fossil",
     "MAX(date)", "economic_data", "daily", 7,
     "CREA incremental API"),
    ("Kiel Ukraine aid", "economic_data.kiel_ukraine_aid",
     "MAX(announcement_date_clean)", "economic_data", "quarterly", 120,
     "Kiel publishes quarterly"),
    ("Bruegel gas flows", "economic_data.bruegel_gas_flows",
     "MAX(date)", "economic_data", "manual", None,
     "Cloudflare blocks VPS — must be refreshed manually"),
    ("OpenSanctions targets", "economic_data.opensanctions_targets",
     "MAX(last_seen::date)", "economic_data", "daily", 30,
     "Sanctions targets list"),
    ("SIPRI military expenditure", "economic_data.sipri_military_expenditure",
     "make_date(MAX(year), 12, 31)", "economic_data", "annual", 540,
     "Annual release ~April each year"),
    ("World Bank GDP", "economic_data.world_bank_gdp",
     "make_date(MAX(year), 12, 31)", "economic_data", "annual", 540,
     "Annual release"),
    ("HAPI IDPs", "humanitarian.hapi_idps",
     "MAX(reference_period_end)", "humanitarian", "monthly", 60,
     "HAPI internally-displaced persons"),
    ("HAPI refugees", "humanitarian.hapi_refugees",
     "MAX(reference_period_end)", "humanitarian", "monthly", 90,
     "HAPI refugees outflow"),
    ("HAPI conflict events", "conflict_events.hapi_conflict_events",
     "MAX(reference_period_end)", "humanitarian", "monthly", 60,
     "HAPI conflict events"),
    ("UNHCR asylum applications", "humanitarian.unhcr_asylum_applications",
     "make_date(MAX(year), 12, 31)", "humanitarian", "annual", 540,
     "Annual UNHCR release"),
    ("OHCHR casualties", "casualties.ohchr_casualties",
     "make_date(MAX(year), MAX(month), 1)", "casualties", "monthly", 60,
     "Known long-broken — has not updated since 2021"),
    ("DeepState territory", "territorial_control.deepstate_territory",
     "MAX(date)", "territorial_control", "monthly", 60,
     "DeepState UA polygons"),
]

REDLINES_DATASETS = [
    # ── redlines DB ─────────────────────────────────────────────────────────
    # Annotation freshness — when was the last confirmed statement annotated?
    ("RRLS confirmed (latest annotation)", "redlines.mv_rrls_confirmed",
     "MAX(date)", "annotations", "daily", 7,
     "Confirmed RRLS statements (matview)"),
    ("NTS confirmed (latest annotation)", "redlines.mv_nts_confirmed",
     "MAX(date)", "annotations", "daily", 7,
     "Confirmed NTS statements (matview)"),
]


def status_for(days_behind: int | None, expected_max_lag_days: int | None) -> str:
    if days_behind is None or expected_max_lag_days is None:
        return "manual"
    if days_behind <= expected_max_lag_days:
        return "fresh"
    if days_behind <= expected_max_lag_days * 2:
        return "lagging"
    if expected_max_lag_days >= 365:
        return "annual_ok"
    return "stale" if days_behind <= expected_max_lag_days * 5 else "very_stale"


def fetch_one(conn, schema_table: str, date_expr: str) -> tuple[str | None, int]:
    sql = f"SELECT {date_expr}::text AS latest, COUNT(*)::bigint AS rows FROM {schema_table}"
    with conn.cursor() as cur:
        try:
            cur.execute(sql)
            row = cur.fetchone()
            return (row[0], int(row[1]))
        except Exception as e:
            print(f"  ! {schema_table}: {e}", file=sys.stderr)
            conn.rollback()
            return (None, 0)


def main() -> None:
    rows: list[dict] = []
    as_of = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    as_of_date = datetime.now(timezone.utc).date()

    print(f"=== Dataset freshness export @ {as_of} ===")

    war_db = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD, dbname="war_datasets"
    )
    for name, schema_table, expr, category, cadence, max_lag, note in DATASETS:
        latest, row_count = fetch_one(war_db, schema_table, expr)
        days_behind = None
        if latest:
            try:
                latest_d = datetime.fromisoformat(latest).date()
                days_behind = (as_of_date - latest_d).days
            except ValueError:
                pass
        status = status_for(days_behind, max_lag)
        rows.append({
            "dataset": name,
            "schema_table": schema_table,
            "category": category,
            "latest_date": latest,
            "rows": row_count,
            "expected_cadence": cadence,
            "expected_max_lag_days": max_lag,
            "days_behind": days_behind,
            "status": status,
            "note": note,
        })
        flag = {"fresh": "✓", "lagging": "·", "stale": "⚠", "very_stale": "✗",
                "annual_ok": "·", "manual": "·"}.get(status, "?")
        print(f"  {flag} {name:35s} {str(latest):>12}  {row_count:>10,}  ({status})")
    war_db.close()

    # redlines DB — separate connection
    try:
        rl_db = psycopg2.connect(
            host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD, dbname="redlines"
        )
        for name, schema_table, expr, category, cadence, max_lag, note in REDLINES_DATASETS:
            # Strip "redlines." prefix — redlines DB tables aren't schema-qualified the same way
            tbl = schema_table.removeprefix("redlines.")
            latest, row_count = fetch_one(rl_db, tbl, expr)
            days_behind = None
            if latest:
                try:
                    latest_d = datetime.fromisoformat(latest).date()
                    days_behind = (as_of_date - latest_d).days
                except ValueError:
                    pass
            status = status_for(days_behind, max_lag)
            rows.append({
                "dataset": name,
                "schema_table": schema_table,
                "category": category,
                "latest_date": latest,
                "rows": row_count,
                "expected_cadence": cadence,
                "expected_max_lag_days": max_lag,
                "days_behind": days_behind,
                "status": status,
                "note": note,
            })
            flag = {"fresh": "✓", "lagging": "·", "stale": "⚠", "very_stale": "✗",
                    "annual_ok": "·", "manual": "·"}.get(status, "?")
            print(f"  {flag} {name:35s} {str(latest):>12}  {row_count:>10,}  ({status})")
        rl_db.close()
    except Exception as e:
        print(f"  ! redlines DB block failed: {e}", file=sys.stderr)

    totals: dict[str, int] = {}
    for r in rows:
        totals[r["status"]] = totals.get(r["status"], 0) + 1

    out = {
        "as_of_utc": as_of,
        "totals": totals,
        "rows": rows,
    }
    OUT.write_text(json.dumps(out, indent=2, default=str))
    print(f"\nWrote {OUT} ({OUT.stat().st_size // 1024} KB)")
    print(f"Totals: {totals}")


if __name__ == "__main__":
    main()
