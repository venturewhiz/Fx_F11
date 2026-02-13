import { useState } from "react";
import { API_GATEWAY_URL, jsonFetch } from "../lib/config";

const BRAND_PLUGIN_PRESETS = [
  { plugin_id: "stripe_payments", label: "Stripe Payments", api_key_ref: "STRIPE_SECRET_KEY" },
  { plugin_id: "amazon_ads", label: "Amazon Ads", account_id: "amazon_brand_account" },
  { plugin_id: "fanatics_ads", label: "Fanatics Ads", account_id: "fanatics_brand_account" },
  { plugin_id: "google_dv360", label: "Google DV360", account_id: "dv360_advertiser_id" },
  { plugin_id: "thetradedesk", label: "The Trade Desk", account_id: "ttd_advertiser_id" },
  { plugin_id: "gam", label: "Google Ad Manager", account_id: "gam_network_code" },
  { plugin_id: "salesforce_cdp", label: "Salesforce CDP", account_id: "sfmc_business_unit" },
  { plugin_id: "adobe_cdp", label: "Adobe RT-CDP", account_id: "adobe_org_id" },
  { plugin_id: "snowflake_analytics", label: "Snowflake Analytics", account_id: "snowflake_account" },
  { plugin_id: "databricks_analytics", label: "Databricks Analytics", account_id: "databricks_workspace" },
];

function asPluginItems(selected) {
  return BRAND_PLUGIN_PRESETS
    .filter((x) => selected[x.plugin_id])
    .map((x) => ({
      plugin_id: x.plugin_id,
      mode: "placeholder",
      account_id: x.account_id || "",
      api_key_ref: x.api_key_ref || "",
      extra: { onboarding_source: "brand_onboarding" },
    }));
}

export default function BrandOnboarding() {
  const [form, setForm] = useState({
    name: "",
    brand_name: "",
    location_city: "",
    location_country: "Australia",
    sports_focus: "football",
    target_leagues: "A-League",
    categories: "beverages",
    website: "",
    monthly_budget: "100000",
    preferred_segments: "hardcore,casual,merch-buyers",
  });
  const [selectedPlugins, setSelectedPlugins] = useState({
    stripe_payments: true,
    amazon_ads: true,
    fanatics_ads: true,
    google_dv360: true,
    gam: true,
    salesforce_cdp: true,
    adobe_cdp: false,
    thetradedesk: false,
    snowflake_analytics: true,
    databricks_analytics: false,
  });
  const [msg, setMsg] = useState("");
  const [tenantId, setTenantId] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMsg("Registering brand and connecting placeholders...");
    try {
      const out = await jsonFetch(`${API_GATEWAY_URL}/tenants/brand/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const nextTenantId = out?.tenant_id || "";
      setTenantId(nextTenantId);

      const pluginItems = asPluginItems(selectedPlugins);
      if (nextTenantId && pluginItems.length) {
        await jsonFetch(`${API_GATEWAY_URL}/tenants/${nextTenantId}/onboarding/plugins`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ items: pluginItems }),
        });
      }

      setMsg("Brand registered and plugin placeholders connected.");
    } catch (err) {
      setMsg(`Error: ${String(err.message || err)}`);
    }
  }

  function togglePlugin(pluginId) {
    setSelectedPlugins((prev) => ({ ...prev, [pluginId]: !prev[pluginId] }));
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Brand Registration + Plugin Setup</h1>
      <p>Complete brand onboarding once: register tenant, set budget/segments, and connect plugin placeholders.</p>
      {msg && <p style={{ color: msg.startsWith("Error") ? "#b71c1c" : "#1b5e20" }}>{msg}</p>}
      {tenantId && <p><strong>tenant_id:</strong> {tenantId}</p>}

      <form onSubmit={submit} style={{ background: "#fffdf7", border: "1px solid #d9cfba", borderRadius: 12, padding: 14 }}>
        <p><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Display Name" style={{ width: "100%", padding: 8 }} /></p>
        <p><input required value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} placeholder="Legal Brand Name" style={{ width: "100%", padding: 8 }} /></p>
        <p><input value={form.location_city} onChange={(e) => setForm({ ...form, location_city: e.target.value })} placeholder="City" style={{ width: "100%", padding: 8 }} /></p>
        <p><input value={form.location_country} onChange={(e) => setForm({ ...form, location_country: e.target.value })} placeholder="Country" style={{ width: "100%", padding: 8 }} /></p>
        <p><input value={form.sports_focus} onChange={(e) => setForm({ ...form, sports_focus: e.target.value })} placeholder="Sports Focus (football, cricket...)" style={{ width: "100%", padding: 8 }} /></p>
        <p><input value={form.target_leagues} onChange={(e) => setForm({ ...form, target_leagues: e.target.value })} placeholder="Target Leagues" style={{ width: "100%", padding: 8 }} /></p>
        <p><input value={form.categories} onChange={(e) => setForm({ ...form, categories: e.target.value })} placeholder="Brand Categories" style={{ width: "100%", padding: 8 }} /></p>
        <p><input value={form.monthly_budget} onChange={(e) => setForm({ ...form, monthly_budget: e.target.value })} placeholder="Monthly Budget" style={{ width: "100%", padding: 8 }} /></p>
        <p><input value={form.preferred_segments} onChange={(e) => setForm({ ...form, preferred_segments: e.target.value })} placeholder="Preferred Fan Segments (comma-separated)" style={{ width: "100%", padding: 8 }} /></p>
        <p><input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="Website" style={{ width: "100%", padding: 8 }} /></p>

        <h3>Plugin Placeholders To Connect</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, marginBottom: 12 }}>
          {BRAND_PLUGIN_PRESETS.map((plugin) => (
            <label key={plugin.plugin_id} style={{ border: "1px solid #d9cfba", borderRadius: 8, padding: 8 }}>
              <input
                type="checkbox"
                checked={Boolean(selectedPlugins[plugin.plugin_id])}
                onChange={() => togglePlugin(plugin.plugin_id)}
                style={{ marginRight: 8 }}
              />
              {plugin.label}
            </label>
          ))}
        </div>

        <button type="submit">Register Brand + Connect Plugins</button>
      </form>
    </div>
  );
}
