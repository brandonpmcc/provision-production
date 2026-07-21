export const dynamic = "force-dynamic";

import Link from "next/link";
import { getProductionJobs, getCrews, getMonthlyGoal, getActivePipelineJobs, getPmStats, getPeople } from "@/lib/airtable";
import { TERRITORIES, getTerritoryByZip, getTerritoryByAddress } from "@/lib/territories";
import { recommendPMsForTerritory, determineSchedulingReadiness, predictStartDate } from "@/lib/recommend";
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
  const [allJobs, pmStats, people] = await Promise.all([
    getActivePipelineJobs().catch(() => []),
    getPmStats().catch(() => []),
    getPeople().catch(() => []),
  ]);

  const { PM_NAME_TO_RECORD_ID } = await import("@/lib/auth");
  const pms = people
    .filter((p) => p.role === "PM" || Object.values(PM_NAME_TO_RECORD_ID).includes(p.id))
    .map((p) => ({ recordId: p.id, name: p.name, email: p.email ?? "" }));

  const pendingJobs = allJobs.filter((j: PipelineJob) => j.productionStage === "Pending Schedule");

  function getJobTerritory(job: PipelineJob) {
    return getTerritoryByZip(job.zip) || getTerritoryByAddress(job.address) || TERRITORIES.unknown;
  }

  const enrichedJobs = pendingJobs.map((job: PipelineJob) => {
    const territory = getJobTerritory(job);
    const { readiness, missingItems, blockingItems } = determineSchedulingReadiness(job);
    const pmSuggestions = recommendPMsForTerritory(job, allJobs, Object.values(TERRITORIES));
    const topPmSuggestion = pmSuggestions[0] || null;
    const prediction = predictStartDate(job, allJobs, topPmSuggestion?.pmName ?? null);
    return {
      job, territory, readiness, missingItems, blockingItems,
      topPmSuggestion, pmSuggestions, prediction,
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
          crews={crews}
          pms={pms}
        />
      )}

      {tab === "calendar" && (
        <>
          {jobs.filter(j => j.startDate).length === 0 ? (
            /* No Production records with dates yet — show helpful state */
            <div className="space-y-4">
              <div className="card text-center py-10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/huey-mascot.png" alt="Huey" className="w-20 h-22 object-contain mx-auto mb-3 opacity-70" />
                <div className="font-display font-black text-provision-navy uppercase text-lg">Calendar is Ready</div>
                <p className="text-provision-gray-text text-sm mt-1 max-w-sm mx-auto">
                  Jobs with scheduled dates will appear here. Use <strong>Pending Queue</strong> → Schedule a job to add start and end dates.
                </p>
                <Link href="/pending-schedule" className="btn-primary mt-4 inline-flex">
                  Go to Pending Queue →
                </Link>
              </div>
              {/* Show what IS in progress as a reference */}
              {allJobs.filter(j => j.productionStage === "In Progress" || j.productionStage === "Scheduled").length > 0 && (
                <div className="card">
                  <div className="section-label mb-3">Active jobs needing dates</div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {allJobs
                      .filter(j => j.productionStage === "In Progress" || j.productionStage === "Scheduled")
                      .map(j => (
                        <div key={j.id} className="flex items-center justify-between text-sm py-1.5 border-b border-provision-gray-mid last:border-0">
                          <div>
                            <span className="font-medium text-provision-navy">{j.name}</span>
                            {j.pmName && <span className="text-provision-gray-muted ml-2 text-xs">{j.pmName}</span>}
                          </div>
                          <span className={`pill text-[10px] ${j.productionStage === "In Progress" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                            {j.productionStage}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <ScheduleBoard
              jobs={jobs}
              crewColors={crewColors}
              weeklyTarget={weeklyTarget}
            />
          )}
        </>
      )}
    </div>
  );
}
