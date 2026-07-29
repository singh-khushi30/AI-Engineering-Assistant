import { AppShell } from "@/components/layout/AppShell";
import { NewReviewForm } from "@/components/reviews/NewReviewForm";

export default function NewReviewPage() {
  return (
    <AppShell showHeading={false}>
      <NewReviewForm />
    </AppShell>
  );
}
