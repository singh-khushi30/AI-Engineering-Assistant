import { AppShell } from "@/components/layout/AppShell";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default function SettingsPage() {
  return (
    <AppShell showHeading={false}>
      <SettingsForm />
    </AppShell>
  );
}
