import { LiveFindingsView } from "@/components/findings/LiveFindingsView";
import { AppShell } from "@/components/layout/AppShell";

export default function StyleFindingsRoute() {
  return (
    <AppShell showHeading={false}>
      <LiveFindingsView category="style" />
    </AppShell>
  );
}
