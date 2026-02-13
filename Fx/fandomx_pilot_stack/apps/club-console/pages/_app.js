import AppShell from "../lib/ui/AppShell";
import "../lib/ui/styles.css";
import "../styles/globals.css";
import HelpChatbot from "../components/HelpChatbot.js";

const nav = [
  ["/", "Overview"],
  ["/login", "Login"],
  ["/onboarding", "Onboarding"],
  ["/control-center", "Control Center"],
  ["/campaigns", "Sponsor Value"],
  ["/channels", "Channel Yield"],
  ["/segments", "Fan Segments"],
  ["/creatives", "Creatives"],
  ["/fml", "FML Publisher"],
  ["/integrations", "Integrations"],
  ["/rewards", "Rewards"],
  ["/settlement", "Settlement"],
  ["/reports", "Reports"],
  ["/help", "Help"],
];

export default function App({ Component, pageProps }) {
  return (
    <AppShell
      shellClass="fx-club-shell"
      title="CLUB OPS"
      subtitle=""
      nav={nav}
      stripItems={["Matchday Ops", "•", "Live FML publishing enabled", "•", "Club revenue tracking active"]}
      orgLogoSrc="/club-badge.svg"
      footerSlot={<HelpChatbot />}
    >
      <Component {...pageProps} />
    </AppShell>
  );
}
