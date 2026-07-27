import { AppShell } from "@/components/layout/AppShell";
import { ReportsLibrary } from "@/components/reports/ReportsLibrary";
import { reportsMock } from "@/data/reports-mock";

export default function ReportsPage() {
  return (
    <AppShell showHeading={false}>
      <ReportsLibrary reports={reportsMock} />
    </AppShell>
  );
}
