export const dynamic = "force-dynamic";

import Link from "next/link";
import { getProductionJobs, getCrews, getMonthlyGoal, getActivePipelineJobs, getPmStats } from "@/lib/airtable";
import { TERRITORIES, getTerritoryByZip, getTerritoryByAddress } from "@/lib/territories";
import { recommendPMsForTerritory, determineSchedulingReadiness } from "@/lib/recommend";
import { ScheduleBoard } from "@/components/ScheduleBoard";
import { PendingScheduleClient } from "@/app/(main)/pending-schedule/PendingScheduleClient";
import type { PipelineJob } from "@/lib/types";
import { CalendarRange, Clock } from "lucide-react";

type Tab = "queue" | "calendar";

function TabBar({ active }: { active: Tab }) {
  return (
    <div className="flex gap-1 bg-provision-gray rounded-xl p-1 w-fit">
      {([
        { id: "queue"    as Tab, label: "Pending Queue", icon: <Clock className="w-4 h-4" /> },
        { id: "calendar" as Tab, label: "Calendar",      icon: <CalendarRange className="w-4 h-4" /> },
      ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(({ id, label, icon }) => (
        <Link
          key={id}
          href={`/schedule?tab=${id}`}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            active === id
              ? "bg-white text-provision-charcoal shadow-card"
              : "text-provision-gray-text hover:text-provision-charcoal"
          }`}
        >
          {icon}
          {label}
        </Link>
      ))}
    </div>
  );
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tab: Tab = searchParams?.tab === "calendar" ? "calendar" : "queue";

  // ── Calendar tab data ──────────────────────────────────────────────────────
  const now = new Date();
  const [jobs, crews, monthGoal] = await Promise.all([
    getProductionJobs().catch(() => []),
    getCrews().catch(() => []),
    getMonthlyGoal(now.getFullYear(), now.getMonth() + 1).catch(() => null),
  ]);

  const crewColors: Record<string, string> = {};
  for (const c of crews) {
    if (c.color) crewColors[c.name] = c.color;
  }
  const weeklyTarget = monthGoal?.productionGoal
    ? Math.round(monthGoal.productionGoal / 4.33)
    : null;

  // ── Queue tab data ─────────────────────────────────────────────────────────
  const [allJobs, pmStats] = await Promise.all([
    getActivePipelineJobs().catch(() => []),
    getPmStats().catch(() => []),
  ]);

  const pendingJobs = allJobs.filter((j: PipelineJob) => j.productionStage === "Pending Schedule");

  function getJobTerritory(job: PipelineJob) {
    return getTerritoryByZip(job.zip) || getTerritoryByAddress(job.address) || TERRITORIES.unknown;
  }

  const enrichedJobs = pendingJobs.map((job: PipelineJob) => {
    const territory = getJobTerritory(job);
    const { readiness, missingItems, blockingItems } = determineSchedulingReadiness(job);
    const pmSuggestions = recommendPMsForTerritory(job, allJobs, Object.values(TERRITORIES));
    return {
      job,
      territory,
      readiness,
      missingItems,
      blockingItems,
      topPmSuggestion: pmSuggestions[0] || null,
      pmSuggestions,
    };
  });

  const totalRevenue = pendingJobs.reduce((sum: number, j: PipelineJob) => sum + (j.value || 0), 0);
  const totalBudgetedHours = pendingJobs.reduce((sum: number, j: PipelineJob) => sum + (j.estimatedHours || 0), 0);
  const readyCount = enrichedJobs.filter(e => e.readiness === "ready").length;
  const blockedCount = enrichedJobs.filter(e => e.blockingItems.length > 0).length;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Schedule</h1>
          <p className="text-sm text-provision-gray-text mt-0.5">
            {tab === "queue"
              ? `${pendingJobs.length} jobs pending · ${readyCount} ready to schedule`
              : "Calendar view of all scheduled jobs"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <TabBar active={tab} />

      {/* Tab content */}
      {tab === "queue" && (
        <PendingScheduleClient
          enrichedJobs={enrichedJobs}
          readinessCounts={{
            all:         enrichedJobs.length,
            ready:       readyCount,
            missingInfo: blockedCount,
            needsReview: enrichedJobs.filter(e => e.readiness === "needs-review").length,
          }}
          territories={Object.values(TERRITORIES).filter(t => t.id !== "unknown")}
        />
      )}

      {tab === "calendar" && (
        <ScheduleBoard
          jobs={jobs}
          crewColors={crewColors}
          weeklyTarget={weeklyTarget}
        />
      )}
    </div>
  );
}
