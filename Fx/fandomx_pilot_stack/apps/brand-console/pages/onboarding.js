import { useState } from "react";
import { API_GATEWAY_URL, jsonFetch } from "../lib/config";

const BRAND_PLUGIN_PRESETS = [
  { plugin_id: "stripe_payments", label: "Stripe Payments", fields: ["api_key_ref", "base_url"] },
  { plugin_id: "amazon_ads", label: "Amazon Ads", fields: ["account_id", "api_key_ref", "base_url"] },
  { plugin_id: "fanatics_ads", label: "Fanatics Ads", fields: ["account_id", "api_key_ref", "base_url"] },
  { plugin_id: "google_dv360", label: "Google DV360", fields: ["account_id", "api_key_ref", "base_url"] },
  { plugin_id: "thetradedesk", label: "The Trade Desk", fields: ["account_id", "api_key_ref", "base_url"] },
  { plugin_id: "gam", label: "Google Ad Manager", fields: ["account_id", "api_key_ref", "base_url"] },
  { plugin_id: "salesforce_cdp", label: "Salesforce CDP", fields: ["account_id", "api_key_ref", "base_url"] },
  { plugin_id: "adobe_cdp", label: "Adobe RT-CDP", fields: ["account_id", "api_key_ref", "base_url"] },
  { plugin_id: "snowflake_analytics", label: "Snowflake Analytics", fields: ["account_id", "api_key_ref", "base_url"] },
  { plugin_id: "databricks_analytics", label: "Databricks Analytics", fields: ["account_id", "api_key_ref", "base_url"] },
];

const initialPluginValues = BRAND_PLUGIN_PRESETS.reduce((m, p) => {
  m[p.plugin_id] = { account_id: "", api_key_ref: "", base_url: "" };
  return m;
}, {});

function asPluginItems(selected, values) {
  return BRAND_PLUGIN_PRESETS
    .filter((x) => selected[x.plugin_id])
    .map((x) => ({
      plugin_id: x.plugin_id,
      mode: "placeholder",
      account_id: values?.[x.plugin_id]?.account_id || "",
      api_key_ref: values?.[x.plugin_id]?.api_key_ref || "",
      base_url: values?.[x.plugin_id]?.base_url || "",
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

  const [pluginValues, setPluginValues] = useState(initialPluginValues);
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

      const pluginItems = asPluginItems(selectedPlugins, pluginValues);
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

  function setPluginField(pluginId, field, value) {
    setPluginValues((prev) => ({
      ...prev,
      [pluginId]: {
        ...(prev[pluginId] || { account_id: "", api_key_ref: "", base_url: "" }),
        [field]: value,
      },
    }));
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Brand Registration + Plugin Setup</h1>
      <p>Register tenant, then save plugin placeholders with credentials/refs for later live cutover.</p>
      {msg && <p style={{ color: msg.startsWith("Error") ? "#b71c1c" : "#1b5e20" }}>{msg}</p>}
      {tenantId && <p><strong>tenant_id:</strong> {tenantId}</p>}

      <form onSubmit={submit} style={{ background: "#fffdf7", border: "1px solid #d9cfba", borderRadius: 12, padding: 14, color: "#0f172a" }}>
        <p><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Display Name" style={{ width: "100%", padding: 8 }} /></p>
        <p><input required value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} placeholder="Legal Brand Name" style={{ width: "100%", padding: 8 }} /></p>
        <p><input value={form.location_city} onChange={(e) => setForm({ ...form, location_city: e.target.value })} placeholder="City" style={{ width: "100%", padding: 8 }} /></p>
        <p><input value={form.location_country} onChange={(e) => setForm({ ...form, location_country: e.target.value })} placeholder="Country" style={{ width: "100%", padding: 8 }} /></p>
        <p><input value={form.sports_focus} onChange={(e) => setForm({ ...form, sports_focus: e.target.value })} placeholder="Sports Focus" style={{ width: "100%", padding: 8 }} /></p>
        <p><input value={form.target_leagues} onChange={(e) => setForm({ ...form, target_leagues: e.target.value })} placeholder="Target Leagues" style={{ width: "100%", padding: 8 }} /></p>
        <p><input value={form.categories} onChange={(e) => setForm({ ...form, categories: e.target.value })} placeholder="Brand Categories" style={{ width: "100%", padding: 8 }} /></p>
        <p><input value={form.monthly_budget} onChange={(e) => setForm({ ...form, monthly_budget: e.target.value })} placeholder="Monthly Budget" style={{ width: "100%", padding: 8 }} /></p>
        <p><input value={form.preferred_segments} onChange={(e) => setForm({ ...form, preferred_segments: e.target.value })} placeholder="Preferred Fan Segments" style={{ width: "100%", padding: 8 }} /></p>
        <p><input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="Website" style={{ width: "100%", padding: 8 }} /></p>

        <h3 style={{ color: "#0f172a" }}>Plugin Placeholders + Credential Refs</h3>
        {BRAND_PLUGIN_PRESETS.map((plugin) => (
          <div key={plugin.plugin_id} style={{ border: "1px solid #d9cfba", borderRadius: 8, padding: 10, marginBottom: 8 }}>
            <label style={{ color: "#0f172a", fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={Boolean(selectedPlugins[plugin.plugin_id])}
                onChange={() => togglePlugin(plugin.plugin_id)}
                style={{ marginRight: 8 }}
              />
              {plugin.label}
            </label>
            {selectedPlugins[plugin.plugin_id] && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, marginTop: 8 }}>
                {plugin.fields.includes("account_id") && (
                  <input
                    value={pluginValues[plugin.plugin_id]?.account_id || ""}
                    onChange={(e) => setPluginField(plugin.plugin_id, "account_id", e.target.value)}
                    placeholder="Account ID"
                    style={{ padding: 8 }}
                  />
                )}
                {plugin.fields.includes("api_key_ref") && (
                  <input
                    value={pluginValues[plugin.plugin_id]?.api_key_ref || ""}
                    onChange={(e) => setPluginField(plugin.plugin_id, "api_key_ref", e.target.value)}
                    placeholder="API Key Ref (Secrets Manager key)"
                    style={{ padding: 8 }}
                  />
                )}
                {plugin.fields.includes("base_url") && (
                  <input
                    value={pluginValues[plugin.plugin_id]?.base_url || ""}
                    onChange={(e) => setPluginField(plugin.plugin_id, "base_url", e.target.value)}
                    placeholder="Base URL (optional now)"
                    style={{ padding: 8 }}
                  />
                )}
              </div>
            )}
          </div>
        ))}

        <button type="submit">Register Brand + Connect Plugins</button>
      </form>
    </div>
  );
}
