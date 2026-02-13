from datetime import datetime, timezone
from typing import Any, Dict, List
import os

def providers_as_json() -> List[Dict[str, Any]]:
    return [
        {"provider": "mock", "mode": "dev", "configured": True, "required_fields": []},
        {"provider": "api-football", "mode": "dev+prod", "configured": bool(os.getenv("API_FOOTBALL_KEY")), "required_fields": ["match_id"]},
        {"provider": "the-sports-db", "mode": "dev+prod", "configured": bool(os.getenv("THE_SPORTS_DB_KEY")), "required_fields": ["match_id"]},
        {"provider": "api-sports", "mode": "dev+prod", "configured": bool(os.getenv("API_SPORTS_KEY")), "required_fields": ["match_id"]},
    ]

def mock_payload(
    event_type: str = "goal",
    minute: int = 67,
    league: str = "A-League",
    home_team: str = "Sydney FC",
    away_team: str = "Opponent FC",
    importance: float = 0.9,
) -> Dict[str, Any]:
    moment_type = "team_success" if event_type.lower() in {"goal", "win", "wicket"} else "moment_shift"
    return {
        "match_id": f"mock-{home_team.replace(' ', '_')}-{away_team.replace(' ', '_')}",
        "sport": "football",
        "league": league,
        "season_context": {"tournament": league, "stage": "league", "must_win": False, "points_pressure": 0.5, "rivalry": "med"},
        "live_context": {"clock": f"{minute}:00", "win_probability": 0.62, "swing": round(min(0.95, max(0.05, importance * 0.2)), 2)},
        "moment": {"type": moment_type, "entity_id": "team_home", "intensity": round(min(0.99, max(0.1, importance)), 2), "window_sec": 90, "event_type": event_type.lower()},
        "source_meta": {"provider": "mock", "fetched_at_utc": datetime.now(timezone.utc).isoformat(), "degraded_fallback": False},
    }

def pull_and_normalize(
    provider: str,
    match_id: str,
    sport: str = "football",
    league: str = "A-League",
    home_team: str = "Sydney FC",
    away_team: str = "Opponent FC",
) -> Dict[str, Any]:
    # Phase-1 placeholder behavior: non-mock providers fallback to deterministic mock payload.
    payload = mock_payload(league=league, home_team=home_team, away_team=away_team)
    payload["match_id"] = match_id
    payload["sport"] = sport
    payload["source_meta"]["provider"] = provider.lower().strip() or "mock"
    payload["source_meta"]["degraded_fallback"] = payload["source_meta"]["provider"] != "mock"
    return payload
