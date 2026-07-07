export const dynamic = "force-dynamic";

import { getActivePipelineJobs, getTerritoryStats, getPmStats, getCrews } from "@/lib/airtable";
import { TERRITORIES, getTerritoryByZip, getTerritoryByAddress, type TerritoryId } from "@/lib/territories";
import { recommendPMsForTerritory, determineSchedulingReadiness } from "@/lib/recommend";
import type { PipelineJob } from "@/lib/types";
import { PendingScheduleClient } from "./PendingScheduleClient";
import { Clock } from "lucide-react";

export default async function PendingSchedulePage() {
  // Fetch all necessary data server-side
  const [allJobs, crews, territoryStats, pmStats] = await Promise.all([
    getActivePipelineJobs().catch(() => []),
    getCrews().catch(() => []),
    getTerritoryStats().catch(() => []),
    getPmStats().catch(() => []),
  ]);

  // Filter to just pending schedule jobs
  const pendingJobs = allJobs.filter((j) => j.productionStage === "Pending Schedule");

  // Helper function to get territory for a job
  function getJobTerritory(job: PipelineJob) {
    return getTerritoryByZip(job.zip) || getTerritoryByAddress(job.address) || TERRITORIES.unknown;
  }

  // Build enriched job data with readiness and PM suggestions
  const enrichedJobs = pendingJobs.map((job) => {
    const territory = getJobTerritory(job);
    const { readiness, missingItems, blockingItems } = determineSchedulingReadiness(job);

    // Get PM recommendations for this job
    const pmSuggestions = recommendPMsForTerritory(job, allJobs, Object.values(TERRITORIES));
    const topSuggestion = pmSuggestions[0];

    return {
      job,
      territory,
      readiness,
      missingItems,
      blockingItems,
      topPmSuggestion: topSuggestion || null,
      pmSuggestions,
    };
  });

  // Calculate summary stats
  const totalRevenue = pendingJobs.reduce((sum, j) => sum + (j.value || 0), 0);
  const totalBudgetedHours = pendingJobs.reduce((sum, j) => sum + (j.estimatedHours || 0), 0);

  // Territory breakdown for pending jobs
  const territoryBreakdown = Object.values(TERRITORIES)
    .filter((t) => t.active)
    .map((territory) => {
      const jobsInTerritory = enrichedJobs.filter((ej) => ej.territory.id === territory.id);
      const revenue = jobsInTerritory.reduce((sum, ej) => sum + (ej.job.value || 0), 0);

      return {
        territory,
        count: jobsInTerritory.length,
        revenue,
        jobs: jobsInTerritory,
      };
    });

  // Readiness breakdown
  const readinessCounts = {
    all: enrichedJobs.length,
    ready: enrichedJobs.filter((ej) => ej.readiness === "ready").length,
    missingInfo: enrichedJobs.filter((ej) => ej.readiness === "missing-info").length,
    needsReview: enrichedJobs.filter((ej) => ej.readiness === "needs-review").length,
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 provision-orange rounded-lg">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold provision-charcoal">Pending Schedule</h1>
            <p className="text-provision-gray-text">
              {pendingJobs.length} job{pendingJobs.length !== 1 ? "s" : ""} waiting to be scheduled · $
              {(totalRevenue / 1000).toFixed(0)}K total revenue · {totalBudgetedHours} budgeted hours
            </p>
          </div>
        </div>

        {/* Quick Stats Chips */}
        <div className="flex gap-3 flex-wrap">
          <div className="pill">
            <div className="font-semibold text-xl provision-orange">{pendingJobs.length}</div>
            <div className="text-sm text-provision-gray-text">Pending Jobs</div>
          </div>
          <div className="pill">
            <div className="font-semibold text-xl provision-orange">${(totalRevenue / 1000).toFixed(0)}K</div>
            <div className="text-sm text-provision-gray-text">Total Revenue</div>
          </div>
          <div className="pill">
            <div className="font-semibold text-xl provision-orange">{totalBudgetedHours}h</div>
            <div className="text-sm text-provision-gray-text">Budgeted Hours</div>
          </div>
        </div>
      </div>

      {/* Territory Load Cards */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold provision-charcoal uppercase tracking-wide">Territory Workload</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {territoryBreakdown.map(({ territory, count, revenue }) => (
            <div key={territory.id} className="card hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: territory.color }}
                  />
                  <h3 className="font-semibold text-sm provision-charcoal">{territory.name}</h3>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-provision-gray-text">Pending Jobs:</span>
                  <span className="font-semibold provision-charcoal">{count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-provision-gray-text">Revenue:</span>
                  <span className="font-semibold provision-orange">${(revenue / 1000).toFixed(1)}K</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PM Load Row */}
      {pmStats.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold provision-charcoal uppercase tracking-wide">PM Workload</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pmStats.map((pm) => (
              <div key={pm.pmEmail} className="card">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold provision-charcoal">{pm.pmName}</h3>
                  <div
                    className={`w-3 h-3 rounded-full ${
                      pm.overloadStatus === "healthy"
                        ? "bg-green-500"
                        : pm.overloadStatus === "busy"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                  />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-provision-gray-text">Active Jobs:</span>
                    <span className="font-semibold provision-charcoal">{pm.activeJobs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-provision-gray-text">Pending Schedule:</span>
                    <span className="font-semibold provision-orange">{pm.pendingScheduleJobs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-provision-gray-text">Budgeted Hours:</span>
                    <span className="font-semibold">{pm.totalBudgetedHours}h</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Scheduler Queue - Pass to Client Component */}
      <PendingScheduleClient
        enrichedJobs={enrichedJobs}
        readinessCounts={readinessCounts}
        territories={Object.values(TERRITORIES)}
      />
    </div>
  );
}
