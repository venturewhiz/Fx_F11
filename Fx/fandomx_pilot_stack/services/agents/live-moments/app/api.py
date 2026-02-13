from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, Any
from uuid import uuid4
from datetime import datetime, timezone
import os
import requests

from .providers import providers_as_json, pull_and_normalize, mock_payload

app = FastAPI(title="Live Moments Agent")
ORCHESTRATOR_URL = os.getenv("ORCHESTRATOR_URL", "http://localhost:8090/events/moment.detected")


class FeedEvent(BaseModel):
    tenant_id: str
    payload: Dict[str, Any]


class ProviderIngestRequest(BaseModel):
    tenant_id: str
    provider: str = "mock"
    match_id: str = "m1"
    sport: str = "football"
    league: str = "A-League"
    home_team: str = "Sydney FC"
    away_team: str = "Opponent FC"


class SimulateRequest(BaseModel):
    tenant_id: str = "club_demo"
    event_type: str = "goal"
    minute: int = 67
    league: str = "A-League"
    home_team: str = "Sydney FC"
    away_team: str = "Opponent FC"
    importance: float = 0.9


def _publish(tenant_id: str, payload: Dict[str, Any], source: str) -> Dict[str, Any]:
    envelope = {
        "event_id": str(uuid4()),
        "event_type": "moment.detected",
        "tenant_id": tenant_id,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "source": source,
        "version": "1.0",
        "payload": payload,
    }
    requests.post(ORCHESTRATOR_URL, json=envelope, timeout=5)
    return {"status": "published", "event_id": envelope["event_id"], "source": source}


@app.get("/health")
def health():
    return {"ok": True, "service": "live-moments-agent", "orchestrator_url": ORCHESTRATOR_URL}


@app.get("/providers")
def providers():
    return {"providers": providers_as_json()}


@app.post("/ingest")
def ingest(evt: FeedEvent):
    return _publish(evt.tenant_id, evt.payload, source="live-moments-agent")


@app.post("/ingest/provider")
def ingest_provider(req: ProviderIngestRequest):
    payload = pull_and_normalize(
        provider=req.provider,
        match_id=req.match_id,
        sport=req.sport,
        league=req.league,
        home_team=req.home_team,
        away_team=req.away_team,
    )
    return _publish(req.tenant_id, payload, source=f"live-moments:{req.provider.lower()}")


@app.post("/simulate")
def simulate(req: SimulateRequest):
    payload = mock_payload(
        event_type=req.event_type,
        minute=req.minute,
        league=req.league,
        home_team=req.home_team,
        away_team=req.away_team,
        importance=req.importance,
    )
    return _publish(req.tenant_id, payload, source="live-moments:mock")
