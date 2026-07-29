import { SearchX } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <AppShell showHeading={false}>
      <EmptyState
        icon={SearchX}
        title="Unknown review"
        description="The requested review ID does not exist. It may have been removed, or the link may be outdated."
        primaryAction={{
          label: "Back to Reviews",
          href: "/reviews",
          variant: "primary",
        }}
        secondaryAction={{
          label: "Start New Review",
          href: "/reviews/new",
        }}
      />
    </AppShell>
  );
}
