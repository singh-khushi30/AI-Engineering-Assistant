import { AppShell } from "@/components/layout/AppShell";
import { ReviewsTable } from "@/components/reviews/ReviewsTable";
import { reviewsMock } from "@/data/reviews-mock";

export default function ReviewsPage() {
  return (
    <AppShell showHeading={false}>
      <ReviewsTable reviews={reviewsMock} />
    </AppShell>
  );
}
