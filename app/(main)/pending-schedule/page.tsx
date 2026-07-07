export const dynamic = "force-dynamic";

import { getActivePipelineJobs, getTerritoryStats, getPmStats, getCrews } from "@/lib/airtable";
import { TERRITORIES, getTerritoryByZip, getTerritoryByAddress } from "@/lib/territories";
import {
  recommendPMsForTerritory,
  determineSchedulingReadiness,
  predictStartDate,
} from "@/lib/recommend";
import type { PipelineJob } from "@/lib/types";
import { PendingScheduleClient } from "./PendingScheduleClient";
import { Clock, DollarSign, Calendar } from "lucide-react";

function money(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

export default async function PendingSchedulePage() {
  const [allJobs, , ,] = await Promise.all([
    getActivePipelineJobs().catch(() => []),
    getCrews().catch(() => []),
    getTerritoryStats().catch(() => []),
    getPmStats().catch(() => []),
  ]);

  const pendingJobs = (allJobs as PipelineJob[]).filter(
    (j) => j.productionStage === "Pending Schedule"
  );

  function getJobTerritory(job: PipelineJob) {
    return getTerritoryByZip(job.zip) || getTerritoryByAddress(job.address) || TERRITORIES.unknown;
  }

  const enrichedJobs = pendingJobs.map((job) => {
    const territory = getJobTerritory(job);
    const { readiness, missingItems, blockingItems } = determineSchedulingReadiness(job);
    const pmSuggestions = recommendPMsForTerritory(job, allJobs, Object.values(TERRITORIES));
    const topPmSuggestion = pmSuggestions[0] ?? null;
    const prediction = predictStartDate(job, allJobs, topPmSuggestion?.pmName ?? null);

    return { job, territory, readiness, missingItems, blockingItems, topPmSuggestion, pmSuggestions, prediction };
  });

  const totalRevenue        = pendingJobs.reduce((s, j) => s + (j.value || 0), 0);
  const readyCount          = enrichedJobs.filter(e => e.readiness === "ready").length;
  const highConfidenceCount = enrichedJobs.filter(e => e.prediction.confidence === "high").length;

  const readinessCounts = {
    all:         enrichedJobs.length,
    ready:       readyCount,
    missingInfo: enrichedJobs.filter(e => e.blockingItems.length > 0).length,
    needsReview: enrichedJobs.filter(e => e.missingItems.length > 0 && e.blockingItems.length === 0).length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="section-label mb-0.5">Scheduling</div>
          <h1 className="page-header">Pending Queue</h1>
          <p className="text-sm text-provision-gray-text mt-0.5">
            {pendingJobs.length} jobs waiting · {readyCount} ready to schedule
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {[
            { icon: <Clock className="w-4 h-4 text-provision-orange" />,     label: "Pending",   val: String(pendingJobs.length), sub: "jobs" },
            { icon: <DollarSign className="w-4 h-4 text-provision-teal" />,  label: "Revenue",   val: money(totalRevenue),       sub: "total" },
            { icon: <Calendar className="w-4 h-4 text-provision-orange" />,  label: "Predicted", val: `${highConfidenceCount}/${pendingJobs.length}`, sub: "high-conf" },
          ].map(({ icon, label, val, sub }) => (
            <div key={label} className="card flex items-center gap-3 py-3 px-4">
              {icon}
              <div>
                <div className="text-[10px] font-bold text-provision-gray-muted uppercase tracking-wide">{label}</div>
                <div className="font-display font-black text-provision-navy text-lg leading-tight">{val}</div>
                <div className="text-[10px] text-provision-gray-muted">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <PendingScheduleClient
        enrichedJobs={enrichedJobs}
        readinessCounts={readinessCounts}
        territories={Object.values(TERRITORIES).filter(t => t.active)}
      />
    </div>
  );
}
