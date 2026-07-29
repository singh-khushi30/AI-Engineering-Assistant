import { LiveFindingsView } from "@/components/findings/LiveFindingsView";
import { AppShell } from "@/components/layout/AppShell";

export default function ArchitectureFindingsRoute() {
  return (
    <AppShell showHeading={false}>
      <LiveFindingsView category="architecture" />
    </AppShell>
  );
}
