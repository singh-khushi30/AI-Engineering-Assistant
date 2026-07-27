import {
  CoverageBreakdownCard,
  DashboardHeader,
  ExecutiveSummaryCard,
  PrioritizedIssues,
  ReportsCard,
  ReviewOverviewCard,
  ReviewSummaryCard,
  ReviewTimeline,
} from "@/components/dashboard";
import { dashboardMock } from "@/data/dashboard-mock";

export function DashboardView() {
  const data = dashboardMock;

  return (
    <div className="space-y-6">
      <DashboardHeader />

      <ReviewOverviewCard data={data.overview} />

      <section aria-label="Review summaries">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.summaryCards.map((card) => (
            <ReviewSummaryCard key={card.id} data={card} />
          ))}
        </div>
      </section>

      <section
        aria-label="Summary and timeline"
        className="grid grid-cols-1 gap-6 xl:grid-cols-2"
      >
        <ExecutiveSummaryCard data={data.executiveSummary} />
        <ReviewTimeline steps={data.timeline} />
      </section>

      <section
        aria-label="Coverage, issues, and reports"
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <CoverageBreakdownCard data={data.coverage} />
        <div className="space-y-6">
          <PrioritizedIssues issues={data.prioritizedIssues} />
          <ReportsCard reports={data.reports} />
        </div>
      </section>
    </div>
  );
}
