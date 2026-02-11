from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, Any
from uuid import uuid4
from datetime import datetime, timezone
import requests

app = FastAPI(title="Live Moments Agent")
ORCHESTRATOR_URL = "http://orchestrator:8090/events/moment.detected"

class FeedEvent(BaseModel):
    tenant_id: str
    payload: Dict[str, Any]

@app.post("/ingest")
def ingest(evt: FeedEvent):
    envelope = {
        "event_id": str(uuid4()),
        "event_type": "moment.detected",
        "tenant_id": evt.tenant_id,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "source": "live-moments-agent",
        "version": "1.0",
        "payload": evt.payload
    }
    requests.post(ORCHESTRATOR_URL, json=envelope, timeout=5)
    return {"status":"published"}
