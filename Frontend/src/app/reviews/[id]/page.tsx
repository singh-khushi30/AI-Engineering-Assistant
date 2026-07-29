import { AppShell } from "@/components/layout/AppShell";
import { LiveReviewDetail } from "@/components/reviews/LiveReviewDetail";
import { getReviewById } from "@/data/reviews-mock";

type ReviewDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReviewDetailPage({ params }: ReviewDetailPageProps) {
  const { id } = await params;
  const mock = getReviewById(id) ?? null;

  return (
    <AppShell showHeading={false}>
      <LiveReviewDetail reviewId={id} mockFallback={mock} />
    </AppShell>
  );
}
