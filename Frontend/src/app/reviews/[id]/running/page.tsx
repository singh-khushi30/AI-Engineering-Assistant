import { AppShell } from "@/components/layout/AppShell";
import { RunningReviewView } from "@/components/reviews/RunningReviewView";

type RunningReviewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RunningReviewPage({ params }: RunningReviewPageProps) {
  const { id } = await params;

  return (
    <AppShell showHeading={false}>
      <RunningReviewView reviewId={id} />
    </AppShell>
  );
}
