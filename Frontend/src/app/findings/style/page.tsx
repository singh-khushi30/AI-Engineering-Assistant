import { FindingsPage } from "@/components/findings/FindingsPage";
import { AppShell } from "@/components/layout/AppShell";
import { findingsPagesMock } from "@/data/findings-mock";

export default function StyleFindingsRoute() {
  return (
    <AppShell showHeading={false}>
      <FindingsPage data={findingsPagesMock.style} />
    </AppShell>
  );
}
