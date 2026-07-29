import { LiveFindingsView } from "@/components/findings/LiveFindingsView";
import { AppShell } from "@/components/layout/AppShell";

export default function TestingFindingsRoute() {
  return (
    <AppShell showHeading={false}>
      <LiveFindingsView category="testing" />
    </AppShell>
  );
}
