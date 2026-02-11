-- =========================================
-- FandomX Fx Optimizer: Postgres Schema
-- =========================================

-- Bandit / RL memory (policy state)
CREATE TABLE IF NOT EXISTS policy_state (
    key TEXT PRIMARY KEY,
    alpha DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    beta DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Allocation audit log
CREATE TABLE IF NOT EXISTS allocations_log (
    run_id UUID NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    key TEXT NOT NULL,
    operator_id TEXT,
    inventory_owner_id TEXT,
    inventory_id TEXT,
    inventory_type TEXT,
    rights_type TEXT,
    campaign_id TEXT,
    channel TEXT,
    placement_ref TEXT,
    allocated_budget DOUBLE PRECISION NOT NULL,
    score DOUBLE PRECISION,
    base_ev DOUBLE PRECISION,
    moment_multiplier DOUBLE PRECISION,
    PRIMARY KEY (run_id, key)
);

-- Outcomes log (learning signal)
CREATE TABLE IF NOT EXISTS outcomes_log (
    id BIGSERIAL PRIMARY KEY,
    run_id UUID,
    key TEXT NOT NULL,
    operator_id TEXT,
    inventory_owner_id TEXT,
    inventory_id TEXT,
    inventory_type TEXT,
    rights_type TEXT,
    campaign_id TEXT,
    channel TEXT,
    placement_ref TEXT,
    spend DOUBLE PRECISION NOT NULL,
    impressions BIGINT NOT NULL DEFAULT 0,
    conversions BIGINT NOT NULL DEFAULT 0,
    realized_profit DOUBLE PRECISION NOT NULL,
    predicted_ev DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_outcomes_key ON outcomes_log(key);

-- 5-min aggregates (streaming)
CREATE TABLE IF NOT EXISTS outcomes_agg_5m (
  window_start TIMESTAMP NOT NULL,
  key TEXT NOT NULL,
  spend DOUBLE PRECISION NOT NULL DEFAULT 0,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  actions BIGINT NOT NULL DEFAULT 0,
  revenue DOUBLE PRECISION NOT NULL DEFAULT 0,
  profit_proxy DOUBLE PRECISION NOT NULL DEFAULT 0,
  PRIMARY KEY (window_start, key)
);
CREATE INDEX IF NOT EXISTS idx_outcomes_agg_key ON outcomes_agg_5m(key);

-- Model registry & predictions (nightly)
CREATE TABLE IF NOT EXISTS model_registry (
  model_name TEXT NOT NULL,
  version TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB,
  PRIMARY KEY (model_name, version)
);

CREATE TABLE IF NOT EXISTS model_predictions (
  key TEXT NOT NULL,
  as_of TIMESTAMP NOT NULL,
  model_version TEXT NOT NULL,
  p_action DOUBLE PRECISION NOT NULL,
  ltv_uplift DOUBLE PRECISION NOT NULL,
  margin_rate DOUBLE PRECISION NOT NULL,
  expected_cpa DOUBLE PRECISION NOT NULL,
  incrementality DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  PRIMARY KEY (key, as_of)
);
CREATE INDEX IF NOT EXISTS idx_model_pred_key ON model_predictions(key);



-- =========================================
-- Admin / Setup tables (Sydney FC + Pepsi UI)
-- =========================================

CREATE TABLE IF NOT EXISTS tenants (
  tenant_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
  campaign_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  name TEXT NOT NULL,
  objective TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS segments (
  segment_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  definition JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS creatives (
  creative_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offers (
  offer_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integrations (
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  config JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_segments_tenant ON segments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_creatives_tenant ON creatives(tenant_id);
CREATE INDEX IF NOT EXISTS idx_offers_tenant ON offers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON integrations(tenant_id);

-- Rights-aware inventory access
CREATE TABLE IF NOT EXISTS inventory_access (
  operator_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  inventory_id TEXT NOT NULL,
  inventory_owner_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  inventory_type TEXT NOT NULL, -- gam/ssp/owned/club/league/broadcaster/shared
  rights_type TEXT NOT NULL, -- owned/licensed/shared
  allowed_channels TEXT[] DEFAULT ARRAY[]::TEXT[],
  active BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from TIMESTAMP NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (operator_id, inventory_id)
);
CREATE INDEX IF NOT EXISTS idx_inventory_access_operator ON inventory_access(operator_id);
CREATE INDEX IF NOT EXISTS idx_inventory_access_owner ON inventory_access(inventory_owner_id);

-- Revenue rules for shadow settlement
CREATE TABLE IF NOT EXISTS revenue_rules (
  rule_id TEXT PRIMARY KEY,
  operator_type TEXT NOT NULL, -- league/club/broadcaster/brand
  inventory_type TEXT NOT NULL, -- gam/ssp/owned/shared/etc
  operator_fee_pct DOUBLE PRECISION NOT NULL,
  inventory_owner_pct DOUBLE PRECISION NOT NULL,
  platform_fee_pct DOUBLE PRECISION NOT NULL,
  effective_from TIMESTAMP NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_revenue_rules_lookup ON revenue_rules(operator_type, inventory_type, effective_from);

-- Shadow settlement daily ledger
CREATE TABLE IF NOT EXISTS settlement_ledger_daily (
  settlement_date DATE NOT NULL,
  operator_id TEXT NOT NULL,
  inventory_owner_id TEXT NOT NULL,
  inventory_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  gross_spend DOUBLE PRECISION NOT NULL DEFAULT 0,
  impressions BIGINT NOT NULL DEFAULT 0,
  conversions BIGINT NOT NULL DEFAULT 0,
  operator_share DOUBLE PRECISION NOT NULL DEFAULT 0,
  owner_share DOUBLE PRECISION NOT NULL DEFAULT 0,
  platform_share DOUBLE PRECISION NOT NULL DEFAULT 0,
  rule_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (settlement_date, operator_id, inventory_owner_id, inventory_id, channel)
);
CREATE INDEX IF NOT EXISTS idx_settlement_date ON settlement_ledger_daily(settlement_date);
