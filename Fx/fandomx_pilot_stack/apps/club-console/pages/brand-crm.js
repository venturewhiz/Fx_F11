import { useEffect, useMemo, useState } from "react";
import { API_GATEWAY_URL, jsonFetch } from "../lib/config";

const LS_KEY = "fx_club_brand_invites_v1";

export default function BrandCrmPage() {
  const [clubTenantId, setClubTenantId] = useState("club_demo");
  const [brandName, setBrandName] = useState("");
  const [channel, setChannel] = useState("email");
  const [invites, setInvites] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setInvites(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(invites));
  }, [invites]);

  async function createInvite(e) {
    e.preventDefault();
    setMsg("");
    try {
      const out = await jsonFetch(`${API_GATEWAY_URL}/invites/brand`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          club_tenant_id: clubTenantId,
          brand_name: brandName || undefined,
          channel,
        }),
      });
      setInvites((p) => [{ ...out, created_at: new Date().toISOString() }, ...p]);
      setBrandName("");
      setMsg("Invite link created.");
    } catch (err) {
      setMsg(`Create failed: ${String(err.message || err)}`);
    }
  }

  const rows = useMemo(
    () =>
      invites.map((i) => ({
        id: i.invite_id || "-",
        brand: i.brand_name || "Unassigned",
        channel: i.channel || "-",
        club: i.club_tenant_id || "-",
        status: i.status || "active",
        link: i.invite_url || "-",
      })),
    [invites]
  );

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Brand Invitations CRM</h1>
      <p>Create shareable onboarding links for brands to join this FML.</p>

      <form onSubmit={createInvite} style={{ background: "#fff", border: "1px solid #dce3ef", borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <p>
          Club Tenant ID:
          <input value={clubTenantId} onChange={(e) => setClubTenantId(e.target.value)} style={{ marginLeft: 8, padding: 6, width: 220 }} />
        </p>
        <p>
          Brand Name:
          <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Optional prefill" style={{ marginLeft: 8, padding: 6, width: 260 }} />
        </p>
        <p>
          Channel:
          <select value={channel} onChange={(e) => setChannel(e.target.value)} style={{ marginLeft: 8, padding: 6 }}>
            <option value="email">Email</option>
            <option value="social">Social</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </p>
        <button type="submit">Generate Invite Link</button>
      </form>

      {msg ? <p>{msg}</p> : null}

      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", borderColor: "#dce3ef", background: "#fff" }}>
        <thead>
          <tr>
            <th>Invite ID</th><th>Brand</th><th>Channel</th><th>Club Tenant</th><th>Status</th><th>Invite Link</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td><td>{r.brand}</td><td>{r.channel}</td><td>{r.club}</td><td>{r.status}</td>
              <td style={{ maxWidth: 480, overflowWrap: "anywhere" }}>{r.link}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan="6">No invites yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
