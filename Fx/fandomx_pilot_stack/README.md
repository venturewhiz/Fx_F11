# FandomX Pilot Stack (End-to-End)

Unified stack for:
- FML FOA backend plugin services
- Postgres + Redpanda data plane
- Fx Optimizer (Python, persisted RL/policy state)
- Club Console UI (Next.js)
- Brand Console UI (Next.js)

## Included Modules

1. Club/Brand management APIs (tenant, campaigns, segments, creatives, offers, integrations)
2. Rights-aware cross-channel optimizer with reinforcement loop (`/optimize`, `/update`)
3. Live moments ingestion (`/ingest`)
4. Club Console modules: Overview, Campaigns, Creatives, Integrations, Rewards, Reports
5. Brand Console modules: Overview, Marketplace, Campaign Builder, Optimization, Safety, Reports
6. Settlement module (shadow settlement): daily split calculation + summary + CSV export

## Services

- `postgres`: `localhost:5432`
- `redpanda`: `localhost:9092`
- `optimizer`: `http://localhost:8000`
- `api-gateway`: `http://localhost:8080`
- `orchestrator`: `http://localhost:8090`
- `live-moments`: `http://localhost:8004`
- `club-console`: `http://localhost:3001`
- `brand-console`: `http://localhost:3002`

## Run

```bash
docker compose up --build
```

Schema is auto-applied on first Postgres init via:
`optimizer/sql/schema.sql`

## Quick Pilot Test

1. Trigger a live moment:

```bash
curl -X POST http://localhost:8004/ingest -H "content-type: application/json" -d '{
  "tenant_id":"club_demo",
  "payload":{
    "match_id":"m1",
    "sport":"football",
    "league":"A-League",
    "season_context":{"tournament":"A-League","stage":"league","must_win":false,"points_pressure":0.5,"rivalry":"med"},
    "live_context":{"clock":"78:12","win_probability":0.63,"swing":0.14},
    "moment":{"type":"team_success","entity_id":"team_home","intensity":0.88,"window_sec":90}
  }
}'
```

2. Open Club Console: `http://localhost:3001`
3. Open Brand Console: `http://localhost:3002`
4. Confirm latest allocations update on overview/optimization pages.

## Rights + Settlement APIs (Phase 1 + 1.5)

- Rights access:
  - `POST /rights/inventory-access`
  - `GET /rights/inventory-access`
- Revenue rules:
  - `POST /finance/revenue-rules`
  - `GET /finance/revenue-rules`
- Settlement:
  - `POST /finance/settlement/run`
  - `GET /finance/settlement/summary`
  - `GET /finance/settlement/export` (CSV)

## Nightly Shadow Settlement Job

```bash
cd optimizer/jobs
export DATABASE_URL=\"postgresql://fx:fxpass@localhost:5432/fxdb\"
python shadow_settlement.py
```

## Notes

- `api-gateway` is now a proxy to optimizer admin endpoints (Postgres-backed), not in-memory.
- Default seeded tenants on optimizer startup:
  - `club_demo` (`CLUB_A`)
  - `brand_demo` (`BRAND_A`)
- Default seeded demo data on startup:
  - `club_demo`: segments, creatives, offers, integrations
  - `brand_demo`: campaigns, creatives, offers, ad account integration
  - `broadcaster_demo`: rights access entries including GAM/SSP-compatible inventory
- Optional security: set `ADMIN_TOKEN` for optimizer + api-gateway in compose.
