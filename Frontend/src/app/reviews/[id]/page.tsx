import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { ReviewDetailView } from "@/components/reviews/ReviewDetailView";
import { getReviewById } from "@/data/reviews-mock";

type ReviewDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReviewDetailPage({ params }: ReviewDetailPageProps) {
  const { id } = await params;
  const review = getReviewById(id);

  if (!review) {
    notFound();
  }

  return (
    <AppShell showHeading={false}>
      <ReviewDetailView review={review} />
    </AppShell>
  );
}
