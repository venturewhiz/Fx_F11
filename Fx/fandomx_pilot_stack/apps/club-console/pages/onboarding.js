import { useState } from "react";
import { API_GATEWAY_URL, jsonFetch } from "../lib/config";

const CLUB_PLUGIN_PRESETS = [
  { plugin_id: "facebook_ads", label: "Facebook Ads", fields: ["account_id", "api_key_ref", "base_url"] },
  { plugin_id: "instagram_ads", label: "Instagram Ads", fields: ["account_id", "api_key_ref", "base_url"] },
  { plugin_id: "youtube_ads", label: "YouTube Ads", fields: ["account_id", "api_key_ref", "base_url"] },
  { plugin_id: "x_ads", label: "X Ads", fields: ["account_id", "api_key_ref", "base_url"] },
  { plugin_id: "gam", label: "Google Ad Manager", fields: ["account_id", "api_key_ref", "base_url"] },
  { plugin_id: "ticketmaster", label: "Ticketmaster", fields: ["account_id", "api_key_ref", "base_url"] },
  { plugin_id: "shopify_commerce", label: "Shopify Commerce", fields: ["account_id", "api_key_ref", "base_url"] },
  { plugin_id: "amazon_commerce", label: "Amazon Commerce", fields: ["account_id", "api_key_ref", "base_url"] },
  { plugin_id: "fanatics_commerce", label: "Fanatics Commerce", fields: ["account_id", "api_key_ref", "base_url"] },
  { plugin_id: "stats_perform", label: "Stats Perform", fields: ["api_key_ref", "base_url"] },
  { plugin_id: "social_listening", label: "Social Listening", fields: ["api_key_ref", "base_url"] },
  { plugin_id: "salesforce_cdp", label: "Salesforce CDP", fields: ["account_id", "api_key_ref", "base_url"] },
  { plugin_id: "adobe_cdp", label: "Adobe RT-CDP", fields: ["account_id", "api_key_ref", "base_url"] },
];

const initialPluginValues = CLUB_PLUGIN_PRESETS.reduce((m, p) => {
  m[p.plugin_id] = { account_id: "", api_key_ref: "", base_url: "" };
  return m;
}, {});

function asPluginItems(selected, values) {
  return CLUB_PLUGIN_PRESETS
    .filter((x) => selected[x.plugin_id])
    .map((x) => ({
      plugin_id: x.plugin_id,
      mode: "placeholder",
      account_id: values?.[x.plugin_id]?.account_id || "",
      api_key_ref: values?.[x.plugin_id]?.api_key_ref || "",
      base_url: values?.[x.plugin_id]?.base_url || "",
      extra: { onboarding_source: "club_onboarding" },
    }));
}

export default function ClubOnboarding() {
  const [form, setForm] = useState({
    name: "",
    club_name: "",
    location_city: "",
    location_country: "Australia",
    sport: "football",
    league: "A-League",
    stadium: "",
    website: "",
    fan_app_url: "",
    loyalty_program: "standard",
  });

  const [selectedPlugins, setSelectedPlugins] = useState({
    facebook_ads: true,
    instagram_ads: true,
    youtube_ads: true,
    x_ads: false,
    gam: true,
    ticketmaster: true,
    shopify_commerce: true,
    amazon_commerce: true,
    fanatics_commerce: true,
    stats_perform: true,
    social_listening: true,
    salesforce_cdp: true,
    adobe_cdp: false,
  });

  const [pluginValues, setPluginValues] = useState(initialPluginValues);
  const [msg, setMsg] = useState("");
  const [tenantId, setTenantId] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMsg("Registering club and connecting placeholders...");
    try {
      const out = await jsonFetch(`${API_GATEWAY_URL}/tenants/club/register`, {
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

      setMsg("Club registered and plugin placeholders connected.");
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
      <h1 style={{ marginTop: 0 }}>Club Registration + Plugin Setup</h1>
      <p>Register club profile and store credential refs for all connected placeholder plugins.</p>
      {msg && <p style={{ color: msg.startsWith("Error") ? "#b71c1c" : "#1b5e20" }}>{msg}</p>}
      {tenantId && <p><strong>tenant_id:</strong> {tenantId}</p>}

      <form onSubmit={submit} style={{ background: "#f8fbff", border: "1px solid #c8d8ec", borderRadius: 12, padding: 14, color: "#0f172a" }}>
        <p><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Display Name" style={{ width: "100%", padding: 8 }} /></p>
        <p><input required value={form.club_name} onChange={(e) => setForm({ ...form, club_name: e.target.value })} placeholder="Legal Club Name" style={{ width: "100%", padding: 8 }} /></p>
        <p><input value={form.location_city} onChange={(e) => setForm({ ...form, location_city: e.target.value })} placeholder="City" style={{ width: "100%", padding: 8 }} /></p>
        <p><input value={form.location_country} onChange={(e) => setForm({ ...form, location_country: e.target.value })} placeholder="Country" style={{ width: "100%", padding: 8 }} /></p>
        <p><input value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} placeholder="Sport" style={{ width: "100%", padding: 8 }} /></p>
        <p><input value={form.league} onChange={(e) => setForm({ ...form, league: e.target.value })} placeholder="League" style={{ width: "100%", padding: 8 }} /></p>
        <p><input value={form.stadium} onChange={(e) => setForm({ ...form, stadium: e.target.value })} placeholder="Stadium" style={{ width: "100%", padding: 8 }} /></p>
        <p><input value={form.fan_app_url} onChange={(e) => setForm({ ...form, fan_app_url: e.target.value })} placeholder="Fan App / DTC URL" style={{ width: "100%", padding: 8 }} /></p>
        <p><input value={form.loyalty_program} onChange={(e) => setForm({ ...form, loyalty_program: e.target.value })} placeholder="Loyalty Program Tier" style={{ width: "100%", padding: 8 }} /></p>
        <p><input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="Website" style={{ width: "100%", padding: 8 }} /></p>

        <h3 style={{ color: "#0f172a" }}>Plugin Placeholders + Credential Refs</h3>
        {CLUB_PLUGIN_PRESETS.map((plugin) => (
          <div key={plugin.plugin_id} style={{ border: "1px solid #c8d8ec", borderRadius: 8, padding: 10, marginBottom: 8 }}>
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

        <button type="submit">Register Club + Connect Plugins</button>
      </form>
    </div>
  );
}
