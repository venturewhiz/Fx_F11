import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { API_GATEWAY_URL, jsonFetch } from "../lib/config";

const LS_KEY = "fx_brand_session_v1";

export default function BrandLoginPage() {
  const router = useRouter();
  const [brandTenantId, setBrandTenantId] = useState("");
  const [clubTenantId, setClubTenantId] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!router.isReady) return;
    const qClub = typeof router.query.club_tenant_id === "string" ? router.query.club_tenant_id : "";
    if (qClub) setClubTenantId(qClub);
  }, [router.isReady, router.query.club_tenant_id]);

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    if (!brandTenantId) return setMsg("Brand tenant id required.");
    if (!clubTenantId) return setMsg("Invalid login link: missing club_tenant_id.");

    try {
      const cfg = await jsonFetch(`${API_GATEWAY_URL}/tenants/${brandTenantId}/config`);
      const mappedClub = cfg?.metadata?.club_tenant_id || "";
      if (mappedClub !== clubTenantId) {
        setMsg("Access denied: this brand account does not belong to this operator FML.");
        return;
      }

      localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          actor_type: "brand",
          actor_tenant_id: brandTenantId,
          club_tenant_id: clubTenantId,
          logged_in_at: new Date().toISOString(),
        })
      );
      setMsg("Login successful.");
      router.push("/campaigns");
    } catch (err) {
      setMsg(`Login failed: ${String(err.message || err)}`);
    }
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Brand Login</h1>
      <p>Operator-scoped login.</p>
      <p><strong>Operator Tenant:</strong> {clubTenantId || "-"}</p>

      <form onSubmit={submit} style={{ background: "#fff", border: "1px solid #dce3ef", borderRadius: 12, padding: 14 }}>
        <p>
          Brand Tenant ID:
          <input value={brandTenantId} onChange={(e) => setBrandTenantId(e.target.value)} style={{ marginLeft: 8, padding: 6, width: 260 }} />
        </p>
        <button type="submit">Login</button>
      </form>
      {msg ? <p style={{ marginTop: 12 }}>{msg}</p> : null}
    </div>
  );
}
