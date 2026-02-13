import AppShell from "../lib/ui/AppShell";
import "../lib/ui/styles.css";
import "../styles/globals.css";
import HelpChatbot from "../components/HelpChatbot.js";

const nav = [
  ["/", "Overview"],
  ["/login", "Login"],
  ["/onboarding", "Onboarding"],
  ["/control-center", "Control Center"],
  ["/marketplace", "Marketplace"],
  ["/plugins", "Plugins"],
  ["/campaigns", "Campaign Performance"],
  ["/channels", "Channels"],
  ["/audiences", "Audience Segments"],
  ["/payments", "Payments"],
  ["/optimization", "Optimization"],
  ["/settlement", "Settlement"],
  ["/safety", "Safety"],
  ["/reports", "Reports"],
  ["/help", "Help"],
];

export default function App({ Component, pageProps }) {
  return (
    <AppShell
      shellClass="fx-brand-shell"
      title="BRAND OPS"
      subtitle=""
      nav={nav}
      stripItems={["Live Ops", "•", "Sydney FC vs Rival Club", "•", "Moment-sensitive budget engine active"]}
      orgLogoSrc="/brand-badge.svg"
      footerSlot={<HelpChatbot />}
    >
      <Component {...pageProps} />
    </AppShell>
  );
}
