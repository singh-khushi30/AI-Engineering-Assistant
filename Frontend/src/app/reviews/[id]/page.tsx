import { AppShell } from "@/components/layout/AppShell";
import { LiveReviewDetail } from "@/components/reviews/LiveReviewDetail";

type ReviewDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReviewDetailPage({ params }: ReviewDetailPageProps) {
  const { id } = await params;

  return (
    <AppShell showHeading={false}>
      <LiveReviewDetail reviewId={id} />
    </AppShell>
  );
}
