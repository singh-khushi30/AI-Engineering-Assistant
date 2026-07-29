import { LiveFindingsView } from "@/components/findings/LiveFindingsView";
import { AppShell } from "@/components/layout/AppShell";

export default function SecurityFindingsRoute() {
  return (
    <AppShell showHeading={false}>
      <LiveFindingsView category="security" />
    </AppShell>
  );
}
