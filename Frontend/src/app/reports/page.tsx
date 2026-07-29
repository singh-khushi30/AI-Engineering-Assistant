import { AppShell } from "@/components/layout/AppShell";
import { LiveReportsLibrary } from "@/components/reports/LiveReportsLibrary";

export default function ReportsPage() {
  return (
    <AppShell showHeading={false}>
      <LiveReportsLibrary />
    </AppShell>
  );
}
