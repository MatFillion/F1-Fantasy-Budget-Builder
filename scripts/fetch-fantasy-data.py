#!/usr/bin/env python3
"""
Fetch F1 Fantasy data directly from the official fantasy.formula1.com feeds API
and write JSON files for the React app.

Usage:
    python scripts/fetch-fantasy-data.py            # fetch and write files
    python scripts/fetch-fantasy-data.py --dry-run   # print what would be written
"""

import argparse
import json
import os
import sys
import time

import requests

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SEASON = 2026

BASE_URL = "https://fantasy.formula1.com/feeds"
SCHEDULE_URL = f"{BASE_URL}/schedule/raceday_en.json"
DRIVERS_URL_TEMPLATE = f"{BASE_URL}/drivers/{{gameday_id}}_en.json"

# Map API full names → app abbreviations
DRIVER_ABBR = {
    "Max Verstappen": "VER",
    "Isack Hadjar": "HAD",
    "George Russell": "RUS",
    "Kimi Antonelli": "ANT",
    "Charles Leclerc": "LEC",
    "Lewis Hamilton": "HAM",
    "Lando Norris": "NOR",
    "Oscar Piastri": "PIA",
    "Fernando Alonso": "ALO",
    "Lance Stroll": "STR",
    "Pierre Gasly": "GAS",
    "Franco Colapinto": "COL",
    "Alexander Albon": "ALB",
    "Alex Albon": "ALB",
    "Carlos Sainz": "SAI",
    "Esteban Ocon": "OCO",
    "Oliver Bearman": "BEA",
    "Nico Hulkenberg": "HUL",
    "Gabriel Bortoleto": "BOR",
    "Sergio Perez": "PER",
    "Valtteri Bottas": "BOT",
    "Liam Lawson": "LAW",
    "Arvid Lindblad": "LIN",
}

CONSTRUCTOR_ABBR = {
    "Red Bull Racing": "RBR",
    "Mercedes": "MER",
    "Ferrari": "FER",
    "McLaren": "MCL",
    "Aston Martin": "AMR",
    "Alpine": "ALP",
    "Williams": "WIL",
    "Haas F1 Team": "HAS",
    "Haas": "HAS",
    "Audi": "AUD",
    "Cadillac": "CAD",
    "Racing Bulls": "RCB",
}

# Reverse lookups: abbreviation → preferred display name
DRIVER_DISPLAY = {v: k for k, v in DRIVER_ABBR.items()}
DRIVER_DISPLAY["ALB"] = "Alex Albon"  # normalise

CONSTRUCTOR_DISPLAY = {v: k for k, v in CONSTRUCTOR_ABBR.items()}
CONSTRUCTOR_DISPLAY["HAS"] = "Haas"

# API constructor TLAs differ from what the app uses
CONSTRUCTOR_TLA_MAP = {
    "AST": "AMR",
    "HAA": "HAS",
    "RBS": "RCB",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def fetch_json(url: str) -> dict:
    """GET a URL and return parsed JSON, or raise on failure."""
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.json()


def safe_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def safe_int(value, default=0):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def driver_abbr(full_name: str, api_tla: str = "") -> str:
    """Resolve a driver abbreviation from their full name or API TLA."""
    if full_name in DRIVER_ABBR:
        return DRIVER_ABBR[full_name]
    # Fuzzy: check if any known name is contained in the API name
    for known, abbr in DRIVER_ABBR.items():
        if known.lower() in full_name.lower() or full_name.lower() in known.lower():
            return abbr
    # Fall back to the API TLA if it looks valid
    if api_tla and len(api_tla) == 3:
        return api_tla.upper()
    # Last resort: first 3 letters of last name
    parts = full_name.strip().split()
    return (parts[-1][:3]).upper() if parts else "UNK"


def constructor_abbr(full_name: str, api_tla: str = "") -> str:
    """Resolve a constructor abbreviation."""
    if full_name in CONSTRUCTOR_ABBR:
        return CONSTRUCTOR_ABBR[full_name]
    for known, abbr in CONSTRUCTOR_ABBR.items():
        if known.lower() in full_name.lower() or full_name.lower() in known.lower():
            return abbr
    mapped = CONSTRUCTOR_TLA_MAP.get(api_tla, api_tla)
    if mapped and len(mapped) >= 2:
        return mapped.upper()[:3]
    parts = full_name.strip().split()
    return (parts[0][:3]).upper() if parts else "UNK"


def extract_driver_race(player: dict) -> dict:
    """Build the race breakdown sub-object from AdditionalStats."""
    stats = player.get("AdditionalStats") or {}
    return {
        "position": safe_int(stats.get("top10_race_position_pts")),
        "qualifyingPosition": safe_int(stats.get("q3_finishes_pts")),
        "overtakeBonus": safe_int(stats.get("overtaking_pts")),
        "fastestLap": safe_int(stats.get("fastest_lap_pts")),
        "dotd": safe_int(stats.get("dotd_pts")),
    }


def extract_driver_sprint(player: dict) -> dict:
    """Build the sprint breakdown sub-object."""
    stats = player.get("AdditionalStats") or {}
    sprint_pts = safe_int(player.get("SprintPoints"))
    return {
        "position": safe_int(stats.get("top8_sprint_position_pts")),
        "qualifyingPosition": 0,
        "fastestLap": 0,
        "overtakeBonus": 0,
    } if sprint_pts else {
        "position": 0,
        "qualifyingPosition": 0,
        "fastestLap": 0,
        "overtakeBonus": 0,
    }


def write_json(path: str, data: dict, dry_run: bool = False):
    if dry_run:
        print(f"    [dry-run] Would write {path}")
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------

def fetch_schedule():
    """Return list of event dicts, one per unique GamedayId, sorted by round."""
    print("Fetching schedule…")
    data = fetch_json(SCHEDULE_URL)
    raw = data.get("Data", {}).get("Value", [])

    # Deduplicate by GamedayId, keep the first entry (has meeting info)
    seen = {}
    has_sprint = {}
    for entry in raw:
        gid = entry["GamedayId"]
        if gid not in seen:
            seen[gid] = entry
            has_sprint[gid] = False
        if "Sprint" in entry.get("SessionType", ""):
            has_sprint[gid] = True

    events = []
    for gid in sorted(seen.keys()):
        e = seen[gid]
        events.append({
            "gameday_id": gid,
            "round": str(e.get("MeetingNumber", gid)),
            "meeting_name": e.get("MeetingName", f"Round {gid}"),
            "country": e.get("CountryName", ""),
            "status": e.get("GDStatus", 0),
            "has_sprint": has_sprint[gid],
        })

    completed = [e for e in events if e["status"] == 4]
    print(f"  Found {len(events)} events, {len(completed)} completed")
    return events


def fetch_players(gameday_id: int):
    """Fetch drivers & constructors for a specific gameday."""
    url = DRIVERS_URL_TEMPLATE.format(gameday_id=gameday_id)
    data = fetch_json(url)
    return data.get("Data", {}).get("Value", [])


def build_race_name(event: dict) -> str:
    """Short race name from the event, e.g. 'Australia'."""
    country = event.get("country", "")
    if country:
        return country
    name = event.get("meeting_name", "")
    return name.replace(" Grand Prix", "").strip() or f"Round {event['round']}"


def main():
    parser = argparse.ArgumentParser(description="Fetch F1 Fantasy data from official API")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be written without writing files")
    args = parser.parse_args()

    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(project_root, "public", "data", str(SEASON))

    # 1. Fetch schedule
    try:
        events = fetch_schedule()
    except Exception as exc:
        print(f"✗ Failed to fetch schedule: {exc}")
        sys.exit(1)

    completed_events = [e for e in events if e["status"] == 4]

    if not completed_events:
        print("⚠  No completed events yet — writing empty data files")

    # 2. For each completed event, fetch per-race player data
    # Accumulate: driver_abbr → { "info": ..., "races": [per-round data] }
    driver_data = {}
    constructor_data = {}

    for event in completed_events:
        gid = event["gameday_id"]
        race_name = build_race_name(event)
        rnd = event["round"]
        print(f"\nFetching gameday {gid} — Round {rnd} ({race_name})…")

        try:
            players = fetch_players(gid)
        except Exception as exc:
            print(f"  ⚠  Failed to fetch gameday {gid}: {exc}")
            continue

        for p in players:
            skill = p.get("Skill")
            full_name = p.get("FUllName", "")
            api_tla = p.get("DriverTLA", "")
            gd_pts = safe_float(p.get("GamedayPoints", 0))
            season_pts = safe_float(p.get("OverallPpints", 0))
            value = p.get("Value", 0)
            picked = safe_int(p.get("SelectedPercentage", 0))
            team = p.get("TeamName", "")

            if skill == 1:  # Driver
                abbr = driver_abbr(full_name, api_tla)
                if abbr not in driver_data:
                    driver_data[abbr] = {
                        "abbreviation": abbr,
                        "displayName": DRIVER_DISPLAY.get(abbr, full_name),
                        "team": team,
                        "position": 0,
                        "value": f"{value}M",
                        "seasonTotalPoints": safe_int(season_pts),
                        "percentagePicked": picked,
                        "races": [],
                    }
                # Update with latest event's cumulative data
                driver_data[abbr]["seasonTotalPoints"] = safe_int(season_pts)
                driver_data[abbr]["value"] = f"{value}M"
                driver_data[abbr]["percentagePicked"] = picked
                if team:
                    driver_data[abbr]["team"] = team

                driver_data[abbr]["races"].append({
                    "round": rnd,
                    "raceName": race_name,
                    "totalPoints": safe_int(gd_pts),
                    "race": extract_driver_race(p),
                    "sprint": extract_driver_sprint(p),
                })
                print(f"  {abbr}: {safe_int(gd_pts):+d} pts")

            elif skill == 2:  # Constructor
                abbr = constructor_abbr(full_name, api_tla)
                if abbr not in constructor_data:
                    constructor_data[abbr] = {
                        "abbreviation": abbr,
                        "displayName": CONSTRUCTOR_DISPLAY.get(abbr, full_name),
                        "value": f"{value}M",
                        "seasonTotalPoints": safe_int(season_pts),
                        "percentagePicked": picked,
                        "races": [],
                    }
                constructor_data[abbr]["seasonTotalPoints"] = safe_int(season_pts)
                constructor_data[abbr]["value"] = f"{value}M"
                constructor_data[abbr]["percentagePicked"] = picked

                constructor_data[abbr]["races"].append({
                    "round": rnd,
                    "raceName": race_name,
                    "totalPoints": safe_int(gd_pts),
                })
                print(f"  {abbr}: {safe_int(gd_pts):+d} pts")

        # Brief pause between API calls
        time.sleep(0.5)

    # 3. Rank drivers by season total points
    sorted_drivers = sorted(
        driver_data.values(),
        key=lambda d: d["seasonTotalPoints"],
        reverse=True,
    )
    for pos, d in enumerate(sorted_drivers, 1):
        d["position"] = pos

    # 4. Write driver JSON files
    print("\n=== Writing driver files ===")
    for d in sorted_drivers:
        abbr = d["abbreviation"]
        path = os.path.join(data_dir, "drivers", f"{abbr}.json")
        write_json(path, d, dry_run=args.dry_run)
        print(f"  {abbr} — {d['displayName']:25s} {d['seasonTotalPoints']:+4d} pts  ({d['value']})")

    # 5. Write constructor JSON files
    print("\n=== Writing constructor files ===")
    sorted_constructors = sorted(
        constructor_data.values(),
        key=lambda c: c["seasonTotalPoints"],
        reverse=True,
    )
    for c in sorted_constructors:
        abbr = c["abbreviation"]
        path = os.path.join(data_dir, "constructors", f"{abbr}.json")
        write_json(path, c, dry_run=args.dry_run)
        print(f"  {abbr} — {c['displayName']:20s} {c['seasonTotalPoints']:+4d} pts  ({c['value']})")

    # 6. Write season.json
    print("\n=== Writing season.json ===")
    race_list = []
    for event in events:
        race_list.append({
            "round": event["round"],
            "raceName": build_race_name(event),
            "hasSprint": event["has_sprint"],
        })

    season_data = {
        "year": SEASON,
        "races": race_list,
        "drivers": [d["abbreviation"] for d in sorted_drivers],
        "constructors": [c["abbreviation"] for c in sorted_constructors],
    }
    season_path = os.path.join(data_dir, "season.json")
    write_json(season_path, season_data, dry_run=args.dry_run)
    print(f"  {len(race_list)} races, {len(sorted_drivers)} drivers, {len(sorted_constructors)} constructors")

    print(f"\n✓ Done — {len(sorted_drivers)} drivers, {len(sorted_constructors)} constructors")


if __name__ == "__main__":
    main()
