import { DashboardView } from "@/components/dashboard/DashboardView";
import { AppShell } from "@/components/layout/AppShell";

export default function DashboardPage() {
  return (
    <AppShell showHeading={false}>
      <DashboardView />
    </AppShell>
  );
}
