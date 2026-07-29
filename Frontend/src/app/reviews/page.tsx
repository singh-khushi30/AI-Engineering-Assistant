import { AppShell } from "@/components/layout/AppShell";
import { LiveReviewsPage } from "@/components/reviews/LiveReviewsPage";

export default function ReviewsPage() {
  return (
    <AppShell showHeading={false}>
      <LiveReviewsPage />
    </AppShell>
  );
}
