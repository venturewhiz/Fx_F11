import { useState } from "react";
import { API_GATEWAY_URL, jsonFetch } from "../lib/config";

const CLUB_PLUGIN_PRESETS = [
  { plugin_id: "facebook_ads", label: "Facebook Ads", account_id: "meta_page_id" },
  { plugin_id: "instagram_ads", label: "Instagram Ads", account_id: "instagram_business_id" },
  { plugin_id: "youtube_ads", label: "YouTube Ads", account_id: "youtube_channel_id" },
  { plugin_id: "x_ads", label: "X Ads", account_id: "x_account_id" },
  { plugin_id: "gam", label: "Google Ad Manager", account_id: "gam_network_code" },
  { plugin_id: "ticketmaster", label: "Ticketmaster", account_id: "ticketing_partner_id" },
  { plugin_id: "shopify_commerce", label: "Shopify Commerce", account_id: "shopify_store" },
  { plugin_id: "amazon_commerce", label: "Amazon Commerce", account_id: "amazon_seller_id" },
  { plugin_id: "fanatics_commerce", label: "Fanatics Commerce", account_id: "fanatics_store_id" },
  { plugin_id: "stats_perform", label: "Stats Perform", api_key_ref: "SPORTS_EVENTS_API_KEY" },
  { plugin_id: "social_listening", label: "Social Listening", api_key_ref: "SOCIAL_API_KEY" },
  { plugin_id: "salesforce_cdp", label: "Salesforce CDP", account_id: "sfmc_business_unit" },
  { plugin_id: "adobe_cdp", label: "Adobe RT-CDP", account_id: "adobe_org_id" },
];

function asPluginItems(selected) {
  return CLUB_PLUGIN_PRESETS
    .filter((x) => selected[x.plugin_id])
    .map((x) => ({
      plugin_id: x.plugin_id,
      mode: "placeholder",
      account_id: x.account_id || "",
      api_key_ref: x.api_key_ref || "",
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

      const pluginItems = asPluginItems(selectedPlugins);
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

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Club Registration + Plugin Setup</h1>
      <p>Register club profile and connect all core placeholders for fan monetization operations.</p>
      {msg && <p style={{ color: msg.startsWith("Error") ? "#b71c1c" : "#1b5e20" }}>{msg}</p>}
      {tenantId && <p><strong>tenant_id:</strong> {tenantId}</p>}

      <form onSubmit={submit} style={{ background: "#f8fbff", border: "1px solid #c8d8ec", borderRadius: 12, padding: 14 }}>
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

        <h3>Plugin Placeholders To Connect</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, marginBottom: 12 }}>
          {CLUB_PLUGIN_PRESETS.map((plugin) => (
            <label key={plugin.plugin_id} style={{ border: "1px solid #c8d8ec", borderRadius: 8, padding: 8 }}>
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

        <button type="submit">Register Club + Connect Plugins</button>
      </form>
    </div>
  );
}
