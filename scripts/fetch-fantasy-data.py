#!/usr/bin/env python3
"""
Fetch F1 Fantasy data and write JSON files for the React app.

Usage:
    python scripts/fetch-fantasy-data.py            # fetch and write files
    python scripts/fetch-fantasy-data.py --dry-run   # print data without writing
"""

import argparse
import json
import os
import sys
from datetime import datetime

from formula_fantasy import (
    get_driver_points,
    get_driver_season_points,
    get_driver_breakdown,
    get_driver_info,
    get_constructor_points,
    get_constructor_season_points,
    get_constructor_info,
    list_drivers,
    list_constructors,
    get_latest_round,
)

SEASON = datetime.now().year

# Proper display names — the API returns slugs like "maxverstappen"
DRIVER_DISPLAY_NAMES = {
    "ALB": "Alex Albon",
    "ALO": "Fernando Alonso",
    "ANT": "Kimi Antonelli",
    "BEA": "Oliver Bearman",
    "BOR": "Gabriel Bortoleto",
    "COL": "Franco Colapinto",
    "DOO": "Jack Doohan",
    "GAS": "Pierre Gasly",
    "HAD": "Isack Hadjar",
    "HAM": "Lewis Hamilton",
    "HUL": "Nico Hulkenberg",
    "LAW": "Liam Lawson",
    "LEC": "Charles Leclerc",
    "NOR": "Lando Norris",
    "OCO": "Esteban Ocon",
    "PIA": "Oscar Piastri",
    "RUS": "George Russell",
    "SAI": "Carlos Sainz",
    "STR": "Lance Stroll",
    "TSU": "Yuki Tsunoda",
    "VER": "Max Verstappen",
}

CONSTRUCTOR_DISPLAY_NAMES = {
    "ALP": "Alpine",
    "AMR": "Aston Martin",
    "FER": "Ferrari",
    "HAS": "Haas",
    "MCL": "McLaren",
    "MER": "Mercedes",
    "RB": "Racing Bulls",
    "RBR": "Red Bull Racing",
    "SAU": "Sauber",
    "WIL": "Williams",
}

# Fallback race names when the API doesn't include them
RACE_NAMES = {
    "1": "Australia",
    "2": "China",
    "3": "Japan",
    "4": "Bahrain",
    "5": "Saudi Arabia",
    "6": "Miami",
    "7": "Emilia Romagna",
    "8": "Monaco",
    "9": "Spain",
    "10": "Canada",
    "11": "Austria",
    "12": "Great Britain",
    "13": "Belgium",
    "14": "Hungary",
    "15": "Netherlands",
    "16": "Italy",
    "17": "Azerbaijan",
    "18": "Singapore",
    "19": "United States",
    "20": "Mexico",
    "21": "Brazil",
    "22": "Las Vegas",
    "23": "Qatar",
    "24": "Abu Dhabi",
}


def race_name_for(round_num, api_race=None):
    """Return a race name from the API object or the fallback dict."""
    if api_race and api_race.get("raceName"):
        return api_race["raceName"]
    return RACE_NAMES.get(str(round_num), f"Round {round_num}")


def safe_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def extract_race_breakdown(breakdown, session_type):
    """Normalise a breakdown dict into the expected output shape."""
    if not breakdown or not isinstance(breakdown, dict):
        if session_type == "race":
            return {"position": 0, "qualifyingPosition": 0, "overtakeBonus": 0, "fastestLap": 0, "dotd": 0}
        return {"position": 0, "qualifyingPosition": 0, "fastestLap": 0, "overtakeBonus": 0}

    if session_type == "race":
        return {
            "position": safe_int(breakdown.get("position")),
            "qualifyingPosition": safe_int(breakdown.get("qualifyingPosition")),
            "overtakeBonus": safe_int(breakdown.get("overtakeBonus")),
            "fastestLap": safe_int(breakdown.get("fastestLap")),
            # API uses "dotf"; expose as "dotd" (driver of the day)
            "dotd": safe_int(breakdown.get("dotf", breakdown.get("dotd"))),
        }
    # sprint
    return {
        "position": safe_int(breakdown.get("position")),
        "qualifyingPosition": safe_int(breakdown.get("qualifyingPosition")),
        "fastestLap": safe_int(breakdown.get("fastestLap")),
        "overtakeBonus": safe_int(breakdown.get("overtakeBonus")),
    }


# ---------------------------------------------------------------------------
# Driver fetching
# ---------------------------------------------------------------------------

def fetch_driver_via_info(abbr, latest_round):
    """Primary path: use get_driver_info() which returns everything at once."""
    info = get_driver_info(abbr)

    races = []
    api_races = info.get("races", [])

    # Build a lookup by round so we can iterate in order
    races_by_round = {str(r.get("round")): r for r in api_races}

    for rnd in range(1, int(latest_round) + 1):
        rnd_str = str(rnd)
        api_race = races_by_round.get(rnd_str, {})
        races.append({
            "round": rnd_str,
            "raceName": race_name_for(rnd, api_race),
            "totalPoints": safe_int(api_race.get("totalPoints")),
            "race": extract_race_breakdown(api_race.get("race"), "race"),
            "sprint": extract_race_breakdown(api_race.get("sprint"), "sprint"),
        })

    display_name = DRIVER_DISPLAY_NAMES.get(abbr, info.get("displayName", abbr))

    return {
        "abbreviation": info.get("abbreviation", abbr),
        "displayName": display_name,
        "team": info.get("team", "Unknown"),
        "position": safe_int(info.get("position")),
        "value": info.get("value", "0M"),
        "seasonTotalPoints": safe_int(info.get("seasonTotalPoints")),
        "percentagePicked": safe_int(info.get("percentagePicked")),
        "races": races,
    }


def fetch_driver_individually(abbr, latest_round):
    """Fallback path: call individual API functions per round."""
    info = get_driver_info(abbr)
    season_pts = get_driver_season_points(abbr)

    races = []
    for rnd in range(1, int(latest_round) + 1):
        rnd_str = str(rnd)
        try:
            total = get_driver_points(abbr, rnd_str)
        except Exception:
            total = 0
        try:
            race_bd = get_driver_breakdown(abbr, rnd_str, "race")
        except Exception:
            race_bd = {}
        try:
            sprint_bd = get_driver_breakdown(abbr, rnd_str, "sprint")
        except Exception:
            sprint_bd = {}

        races.append({
            "round": rnd_str,
            "raceName": race_name_for(rnd),
            "totalPoints": safe_int(total),
            "race": extract_race_breakdown(race_bd, "race"),
            "sprint": extract_race_breakdown(sprint_bd, "sprint"),
        })

    display_name = DRIVER_DISPLAY_NAMES.get(abbr, info.get("displayName", abbr))

    return {
        "abbreviation": info.get("abbreviation", abbr),
        "displayName": display_name,
        "team": info.get("team", "Unknown"),
        "position": safe_int(info.get("position")),
        "value": info.get("value", "0M"),
        "seasonTotalPoints": safe_int(season_pts),
        "percentagePicked": safe_int(info.get("percentagePicked")),
        "races": races,
    }


def fetch_driver(abbr, latest_round):
    """Try the efficient info-based path first, fall back to per-round calls."""
    try:
        return fetch_driver_via_info(abbr, latest_round)
    except Exception as exc:
        print(f"  ⚠  get_driver_info failed for {abbr} ({exc}), trying individual calls…")
        try:
            return fetch_driver_individually(abbr, latest_round)
        except Exception as exc2:
            print(f"  ✗  Failed to fetch driver {abbr}: {exc2}")
            return None


# ---------------------------------------------------------------------------
# Constructor fetching
# ---------------------------------------------------------------------------

def fetch_constructor_via_info(abbr, latest_round):
    """Primary path: use get_constructor_info()."""
    info = get_constructor_info(abbr)

    races = []
    api_races = info.get("races", [])
    races_by_round = {str(r.get("round")): r for r in api_races}

    for rnd in range(1, int(latest_round) + 1):
        rnd_str = str(rnd)
        api_race = races_by_round.get(rnd_str, {})
        races.append({
            "round": rnd_str,
            "raceName": race_name_for(rnd, api_race),
            "totalPoints": safe_int(api_race.get("totalPoints")),
        })

    display_name = CONSTRUCTOR_DISPLAY_NAMES.get(abbr, info.get("displayName", abbr))

    return {
        "abbreviation": info.get("abbreviation", abbr),
        "displayName": display_name,
        "value": info.get("value", "0M"),
        "seasonTotalPoints": safe_int(info.get("seasonTotalPoints")),
        "percentagePicked": safe_int(info.get("percentagePicked")),
        "races": races,
    }


def fetch_constructor_individually(abbr, latest_round):
    """Fallback: per-round calls."""
    info = get_constructor_info(abbr)
    season_pts = get_constructor_season_points(abbr)

    races = []
    for rnd in range(1, int(latest_round) + 1):
        rnd_str = str(rnd)
        try:
            total = get_constructor_points(abbr, rnd_str)
        except Exception:
            total = 0
        races.append({
            "round": rnd_str,
            "raceName": race_name_for(rnd),
            "totalPoints": safe_int(total),
        })

    display_name = CONSTRUCTOR_DISPLAY_NAMES.get(abbr, info.get("displayName", abbr))

    return {
        "abbreviation": info.get("abbreviation", abbr),
        "displayName": display_name,
        "value": info.get("value", "0M"),
        "seasonTotalPoints": safe_int(season_pts),
        "percentagePicked": safe_int(info.get("percentagePicked")),
        "races": races,
    }


def fetch_constructor(abbr, latest_round):
    try:
        return fetch_constructor_via_info(abbr, latest_round)
    except Exception as exc:
        print(f"  ⚠  get_constructor_info failed for {abbr} ({exc}), trying individual calls…")
        try:
            return fetch_constructor_individually(abbr, latest_round)
        except Exception as exc2:
            print(f"  ✗  Failed to fetch constructor {abbr}: {exc2}")
            return None


# ---------------------------------------------------------------------------
# File writing helpers
# ---------------------------------------------------------------------------

def write_json(path, data, dry_run=False):
    if dry_run:
        print(json.dumps(data, indent=2))
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def build_season_json(all_drivers, all_constructors, latest_round):
    """Build the season.json with the race calendar and metadata."""
    race_list = []
    # Derive race names from the first driver that has data
    sample = next((d for d in all_drivers if d and d.get("races")), None)
    for rnd in range(1, int(latest_round) + 1):
        rnd_str = str(rnd)
        name = RACE_NAMES.get(rnd_str, f"Round {rnd}")
        if sample:
            for r in sample["races"]:
                if r["round"] == rnd_str:
                    name = r["raceName"]
                    break
        race_list.append({"round": rnd_str, "raceName": name})

    return {
        "season": SEASON,
        "latestRound": str(latest_round),
        "totalDrivers": len([d for d in all_drivers if d]),
        "totalConstructors": len([c for c in all_constructors if c]),
        "races": race_list,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Fetch F1 Fantasy data")
    parser.add_argument("--dry-run", action="store_true", help="Print data without writing files")
    args = parser.parse_args()

    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # Determine latest round
    print("Fetching latest round…")
    try:
        latest_round = get_latest_round()
    except Exception as exc:
        print(f"✗ Could not determine latest round: {exc}")
        sys.exit(1)
    print(f"Season {SEASON} · latest round: {latest_round}\n")

    # --- Drivers ---
    print("=== Drivers ===")
    try:
        drivers = list_drivers()
    except Exception as exc:
        print(f"✗ Could not list drivers: {exc}")
        sys.exit(1)

    all_drivers = []
    for abbr in sorted(drivers):
        print(f"  Fetching {abbr}…", end=" ", flush=True)
        data = fetch_driver(abbr, latest_round)
        if data:
            pts = data["seasonTotalPoints"]
            print(f"done ({pts} pts)")
            path = os.path.join(project_root, "public", "data", str(SEASON), "drivers", f"{abbr}.json")
            write_json(path, data, dry_run=args.dry_run)
            all_drivers.append(data)
        else:
            print("skipped")

    # --- Constructors ---
    print("\n=== Constructors ===")
    try:
        constructors = list_constructors()
    except Exception as exc:
        print(f"✗ Could not list constructors: {exc}")
        sys.exit(1)

    all_constructors = []
    for abbr in sorted(constructors):
        print(f"  Fetching {abbr}…", end=" ", flush=True)
        data = fetch_constructor(abbr, latest_round)
        if data:
            pts = data["seasonTotalPoints"]
            print(f"done ({pts} pts)")
            path = os.path.join(project_root, "public", "data", str(SEASON), "constructors", f"{abbr}.json")
            write_json(path, data, dry_run=args.dry_run)
            all_constructors.append(data)
        else:
            print("skipped")

    # --- Season summary ---
    print("\n=== Season ===")
    season_data = build_season_json(all_drivers, all_constructors, latest_round)
    season_path = os.path.join(project_root, "public", "data", str(SEASON), "season.json")
    write_json(season_path, season_data, dry_run=args.dry_run)
    print(f"  Wrote season.json ({len(season_data['races'])} races)")

    print(f"\n✓ Done — {len(all_drivers)} drivers, {len(all_constructors)} constructors")


if __name__ == "__main__":
    main()
