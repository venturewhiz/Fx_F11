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
  ["/campaigns", "Campaign Builder"],
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
      title="Brand Ops"
      subtitle=""
      nav={nav}
      stripItems={["Live Ops", "•", "Sydney FC vs Rival Club", "•", "Moment-sensitive budget engine active"]}
      footerSlot={<HelpChatbot />}
    >
      <Component {...pageProps} />
    </AppShell>
  );
}
