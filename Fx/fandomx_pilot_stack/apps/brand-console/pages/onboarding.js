import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { API_GATEWAY_URL, jsonFetch } from "../lib/config";

export default function BrandOnboarding() {
  const router = useRouter();
  const [brandName, setBrandName] = useState("");
  const [inviteId, setInviteId] = useState("");
  const [clubTenantId, setClubTenantId] = useState("");
  const [msg, setMsg] = useState("");
  const [tenantId, setTenantId] = useState("");

  useEffect(() => {
    if (!router.isReady) return;
    const qInvite = typeof router.query.invite_id === "string" ? router.query.invite_id : "";
    const qClub = typeof router.query.club_tenant_id === "string" ? router.query.club_tenant_id : "";
    if (qInvite) setInviteId(qInvite);
    if (qClub) setClubTenantId(qClub);
  }, [router.isReady, router.query.invite_id, router.query.club_tenant_id]);

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    if (!inviteId) {
      setMsg("Invite link required. Please use operator shared onboarding URL.");
      return;
    }
    try {
      const out = await jsonFetch(`${API_GATEWAY_URL}/tenants/brand/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invite_id: inviteId,
          brand_name: brandName || undefined,
          club_tenant_id: clubTenantId || undefined,
        }),
      });
      setTenantId(out?.tenant_id || "");
      setMsg("Brand tenant created. You can now open Campaign Performance and Channels.");
    } catch (err) {
      setMsg(`Registration failed: ${String(err.message || err)}`);
    }
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Brand Onboarding</h1>
      <p>Join operator FML via invite link and start ad activation.</p>

      <form onSubmit={submit} style={{ background: "#fff", border: "1px solid #dce3ef", borderRadius: 12, padding: 14 }}>
        <p>
          Invite ID:
          <input value={inviteId} onChange={(e) => setInviteId(e.target.value)} style={{ marginLeft: 8, width: 320, padding: 6 }} />
        </p>
        <p>
          Club Tenant (optional):
          <input value={clubTenantId} onChange={(e) => setClubTenantId(e.target.value)} style={{ marginLeft: 8, width: 220, padding: 6 }} />
        </p>
        <p>
          Brand Name:
          <input value={brandName} onChange={(e) => setBrandName(e.target.value)} style={{ marginLeft: 8, width: 260, padding: 6 }} />
        </p>
        <button type="submit">Register Brand</button>
      </form>

      {msg ? <p style={{ marginTop: 12 }}>{msg}</p> : null}
      {tenantId ? <p><strong>Brand Tenant ID:</strong> {tenantId}</p> : null}
    </div>
  );
}
