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
    setInviteId(typeof router.query.invite_id === "string" ? router.query.invite_id : "");
    setClubTenantId(typeof router.query.club_tenant_id === "string" ? router.query.club_tenant_id : "");
    if (typeof router.query.brand_name === "string") setBrandName(router.query.brand_name);
  }, [router.isReady, router.query.invite_id, router.query.club_tenant_id, router.query.brand_name]);

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    if (!inviteId) return setMsg("Invalid onboarding link: missing invite_id.");
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
      setMsg("Brand registration successful.");
    } catch (err) {
      setMsg(`Registration failed: ${String(err.message || err)}`);
    }
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Brand Onboarding</h1>
      <p>Operator invite-based onboarding.</p>
      <p><strong>Invite ID:</strong> {inviteId || "-"}</p>
      <p><strong>Operator Tenant:</strong> {clubTenantId || "-"}</p>

      <form onSubmit={submit} style={{ background: "#fff", border: "1px solid #dce3ef", borderRadius: 12, padding: 14 }}>
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
