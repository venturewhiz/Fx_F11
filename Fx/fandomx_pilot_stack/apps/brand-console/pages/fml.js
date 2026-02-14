import { useState } from "react";

export default function GenericFmlPage() {
  const [operatorName, setOperatorName] = useState("");
  const [clubTenantId, setClubTenantId] = useState("");
  const [clubLogo, setClubLogo] = useState("");
  const [inviteId, setInviteId] = useState("");

  const inviteUrl = `/onboarding?invite_id=${encodeURIComponent(inviteId)}&club_tenant_id=${encodeURIComponent(clubTenantId)}${clubLogo ? `&club_logo=${encodeURIComponent(clubLogo)}` : ""}`;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>FandomX Operator FML</h1>
      <p>Brand self-serve start for a specific operator FML context.</p>

      <section style={{ background: "#fff", border: "1px solid #dce3ef", borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <h2 style={{ marginTop: 0 }}>Operator Context</h2>
        <p>
          Operator Name:
          <input value={operatorName} onChange={(e) => setOperatorName(e.target.value)} style={{ marginLeft: 8, padding: 6, width: 260 }} />
        </p>
        <p>
          Club Tenant ID:
          <input value={clubTenantId} onChange={(e) => setClubTenantId(e.target.value)} style={{ marginLeft: 8, padding: 6, width: 220 }} />
        </p>
        <p>
          Club Logo URL:
          <input value={clubLogo} onChange={(e) => setClubLogo(e.target.value)} style={{ marginLeft: 8, padding: 6, width: 420 }} />
        </p>
        <p>
          Invite ID:
          <input value={inviteId} onChange={(e) => setInviteId(e.target.value)} style={{ marginLeft: 8, padding: 6, width: 220 }} />
        </p>
      </section>

      <section style={{ background: "#fff", border: "1px solid #dce3ef", borderRadius: 12, padding: 14 }}>
        <h2 style={{ marginTop: 0 }}>Brand Start Link</h2>
        <p><strong>{operatorName || "Operator"}</strong> FML onboarding:</p>
        <p style={{ overflowWrap: "anywhere" }}>{inviteUrl}</p>
        <a href={inviteUrl}>Open Brand Onboarding</a>
      </section>
    </div>
  );
}
