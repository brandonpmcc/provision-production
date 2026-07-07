/**
 * Crew + PM recommendation engine for ProVision Production.
 *
 * All logic runs pure client-side — no extra API calls.
 * Inputs: the job being scheduled, the full crews list, all active pipeline jobs.
 * Outputs: ranked recommendations with scores and human-readable reasons.
 */

import type { PipelineJob, Crew, SchedulingReadiness } from "./types";
import type { Territory } from "./territories";

// ─── Zone lookup (mirrors MapClient.tsx) ──────────────────────────────────

const ZONE_BY_ZIP: Record<string, string> = {
  "32250": "Jacksonville Beach",
  "32233": "Atlantic Beach",
  "32266": "Neptune Beach",
  "32082": "Ponte Vedra",
  "32081": "Nocatee",
  "32084": "St. Augustine",
  "32086": "St. Augustine",
  "32092": "St. Augustine",
  "32095": "St. Augustine",
  "32097": "Yulee",
  "32034": "Fernandina/Amelia",
  "32257": "Mandarin",
  "32223": "Mandarin",
  "32258": "Mandarin",
  "32259": "St. Johns",
  "32003": "Orange Park",
  "32073": "Orange Park",
  "32065": "Orange Park",
  "32068": "Middleburg",
  "32205": "Riverside/Avondale",
  "32204": "Riverside/Avondale",
  "32210": "Westside",
  "32244": "Westside",
  "32218": "Northside",
  "32219": "Northside",
  "32226": "Northside",
  "32256": "Southside",
  "32224": "Southside",
  "32225": "Arlington/Southside",
  "32246": "Southside",
  "32217": "San Marco",
  "32207": "San Marco",
};

function jobZone(zip: string | null | undefined): string {
  return ZONE_BY_ZIP[zip ?? ""] ?? "Other";
}

/** Project type text → canonical trade name used in Crews table */
function toTrade(projectType: string | null): string | null {
  if (!projectType) return null;
  const t = projectType.toLowerCase();
  if (t.includes("paint"))              return "Painting";
  if (t.includes("sid"))                return "Siding";
  if (t.includes("gutter"))             return "Gutters";
  if (t.includes("carp"))               return "Carpentry";
  if (t.includes("commercial"))         return "Commercial";
  if (t.includes("pressure") || t.includes("wash")) return "Pressure Washing";
  if (t.includes("drywall"))            return "Drywall";
  return null;
}

/** Stages that count as "active workload" for a crew/PM */
const ACTIVE_STAGES = new Set([
  "Pending Schedule",
  "Needs Confirmation",
  "Scheduled",
  "Materials Needed",
  "Ready to Start",
  "In Progress",
  "Final Walkthrough",
]);

// ─── Crew recommendation ──────────────────────────────────────────────────

export interface CrewRecommendation {
  crew: Crew;
  /** 0–100 match score */
  score: number;
  /** Short positive reasons to show as green chips */
  reasons: string[];
  /** Short caution notes to show as amber chips */
  warnings: string[];
  /** How many non-completed jobs this crew currently has */
  activeJobCount: number;
}

export function recommendCrews(
  job: PipelineJob,
  crews: Crew[],
  allJobs: PipelineJob[]
): CrewRecommendation[] {
  const jobZoneName = jobZone(job.zip);
  const requiredTrade = toTrade(job.projectType);

  // Build crew → active job count from real pipeline data
  const crewLoad = new Map<string, number>();
  for (const j of allJobs) {
    if (!j.crew || !ACTIVE_STAGES.has(j.productionStage)) continue;
    crewLoad.set(j.crew, (crewLoad.get(j.crew) ?? 0) + 1);
    if (j.crew2) {
      crewLoad.set(j.crew2, (crewLoad.get(j.crew2) ?? 0) + 1);
    }
  }

  const recommendations: CrewRecommendation[] = crews
    .filter((c) => c.active)
    .map((crew) => {
      let raw = 0;
      const reasons: string[] = [];
      const warnings: string[] = [];
      const activeCount = crewLoad.get(crew.name) ?? 0;

      // ── Trade match (0 or 40 pts) ────────────────────────────
      if (requiredTrade) {
        if (crew.trades.includes(requiredTrade as never)) {
          raw += 40;
          reasons.push(`${requiredTrade}`);
        } else {
          warnings.push(`No ${requiredTrade} trade`);
        }
      } else {
        // Unknown type — give partial credit so crews still show
        raw += 20;
      }

      // ── Zone coverage (0 or 30 pts) ──────────────────────────
      const coversAnywhere = crew.coverageAreas.includes("Anywhere" as never);
      const coversZone = jobZoneName !== "Other" && crew.coverageAreas.includes(jobZoneName as never);
      if (coversAnywhere) {
        raw += 30;
        reasons.push("Covers all areas");
      } else if (coversZone) {
        raw += 30;
        reasons.push(jobZoneName);
      } else if (jobZoneName !== "Other") {
        warnings.push(`${jobZoneName} outside coverage`);
      }

      // ── Workload / capacity (0–20 pts) ───────────────────────
      //   0 jobs → 20, 1 → 16, 2 → 12, 3 → 8, 4 → 4, 5+ → 0
      const capacityPts = Math.max(0, 20 - activeCount * 4);
      raw += capacityPts;
      if (activeCount === 0)      reasons.push("No active jobs");
      else if (activeCount <= 2)  reasons.push(`${activeCount} active job${activeCount > 1 ? "s" : ""}`);
      else                        warnings.push(`${activeCount} active jobs`);

      // ── In-house bonus (+8 pts) ──────────────────────────────
      if (crew.inHouse) {
        raw += 8;
        reasons.push("In-house");
      }

      // ── Normalise to 0–100 ───────────────────────────────────
      const maxPossible = 40 + 30 + 20 + 8; // 98
      const score = Math.round(Math.min(100, (raw / maxPossible) * 100));

      return { crew, score, reasons, warnings, activeJobCount: activeCount };
    });

  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// ─── PM recommendation ────────────────────────────────────────────────────

/**
 * Known active PMs and their Airtable People record IDs.
 * Confirmed from live DJ Jobs data — Ali's full DripJobs name is "Ali Ubeda Jr".
 * Colin Colby left the company but still has jobs in DripJobs — excluded from recommendations.
 */
const PM_ROSTER = [
  { name: "Nico Lawler",     recordId: "recIWuHhrhcJvOCIM" },
  { name: "Tyler Grodivant", recordId: "recsAsvt9rVtOdN7w" },
  { name: "Ali Ubeda Jr",    recordId: "recAliPlaceholder0001" }, // TODO: confirm real People record ID
];

export interface PMRecommendation {
  name: string;
  firstName: string;
  recordId: string;
  /** Active (non-completed) jobs currently assigned to this PM */
  activeJobCount: number;
  /** Does this PM already have jobs in the same zone? */
  zoneMatch: boolean;
  /** Is this the PM already assigned to the job via DripJobs? */
  isCurrentPM: boolean;
  /** Whether this is the top pick */
  isRecommended: boolean;
}

export function recommendPMs(
  job: PipelineJob,
  allJobs: PipelineJob[]
): PMRecommendation[] {
  const jobZoneName = jobZone(job.zip);

  const ranked = PM_ROSTER.map((pm) => {
    const pmJobs = allJobs.filter(
      (j) => j.pmName === pm.name && ACTIVE_STAGES.has(j.productionStage)
    );
    const zoneMatch =
      jobZoneName !== "Other" &&
      pmJobs.some((j) => jobZone(j.zip) === jobZoneName);

    return {
      name: pm.name,
      firstName: pm.name.split(" ")[0],
      recordId: pm.recordId,
      activeJobCount: pmJobs.length,
      zoneMatch,
      isCurrentPM: job.pmName === pm.name,
      isRecommended: false,
    };
  });

  // Sort: zone match first, then lightest load
  ranked.sort((a, b) => {
    if (a.zoneMatch && !b.zoneMatch) return -1;
    if (!a.zoneMatch && b.zoneMatch)  return 1;
    return a.activeJobCount - b.activeJobCount;
  });

  if (ranked.length > 0) ranked[0].isRecommended = true;
  return ranked;
}

// ─── Territory-based PM recommendation ────────────────────────────────────

export interface TerritoryPMSuggestion {
  pmEmail: string;
  pmName: string;
  pmRecordId: string;
  score: number;
  scoreBreakdown: {
    territoryMatch: number;
    isPrimary: number;
    capacityScore: number;
    revenueBalance: number;
    geographicCluster: number;
  };
  reasons: string[];
  warnings: string[];
  activeJobCount: number;
  isCurrentPM: boolean;
  isRecommended: boolean;
  explanation: string;
}

/**
 * Recommend PMs for a territory-aware scheduling context.
 * Scores based on territory assignment, capacity, and geographic clustering.
 */
export function recommendPMsForTerritory(
  job: {
    zip: string;
    projectType: string | null;
    pmName: string | null;
    estimatedHours: number | null;
    value: number | null;
  },
  allJobs: PipelineJob[],
  territories: Territory[]
): TerritoryPMSuggestion[] {
  const jobZoneName = jobZone(job.zip);

  // Compute PM stats for scoring
  const pmStats = new Map<
    string,
    {
      name: string;
      recordId: string;
      activeJobs: number;
      totalRevenue: number;
      totalHours: number;
      jobsInZone: number;
    }
  >();

  for (const pm of PM_ROSTER) {
    const pmJobs = allJobs.filter((j) => j.pmName === pm.name && ACTIVE_STAGES.has(j.productionStage));
    let totalRevenue = 0;
    let totalHours = 0;
    let jobsInZone = 0;

    for (const j of pmJobs) {
      if (j.value) totalRevenue += j.value;
      if (j.estimatedHours) totalHours += j.estimatedHours;
      if (jobZone(j.zip) === jobZoneName) jobsInZone++;
    }

    pmStats.set(pm.recordId, {
      name: pm.name,
      recordId: pm.recordId,
      activeJobs: pmJobs.length,
      totalRevenue,
      totalHours,
      jobsInZone,
    });
  }

  // Score each PM
  const suggestions: TerritoryPMSuggestion[] = PM_ROSTER.map((pm) => {
    const stats = pmStats.get(pm.recordId)!;
    const scoreBreakdown = {
      territoryMatch: 0,
      isPrimary: 0,
      capacityScore: 0,
      revenueBalance: 0,
      geographicCluster: 0,
    };
    const reasons: string[] = [];
    const warnings: string[] = [];

    // ── Territory match (0-40): Is this PM's primary territory this job's territory? ──
    const primaryTerr = territories.find((t) => t.primaryPmEmail && t.primaryPmEmail.includes(pm.name));
    const backupTerr = territories.find((t) => t.backupPmEmail && t.backupPmEmail.includes(pm.name));
    if (primaryTerr) {
      scoreBreakdown.territoryMatch = 40;
      scoreBreakdown.isPrimary = 25;
      reasons.push(`Primary PM for ${primaryTerr.name}`);
    } else if (backupTerr) {
      scoreBreakdown.territoryMatch = 20;
      reasons.push(`Backup PM for ${backupTerr.name}`);
    }

    // ── Capacity score (0-20): Based on active jobs relative to max ──
    // 0 jobs = 20, scales down as jobs increase
    const maxJobs = 15;
    scoreBreakdown.capacityScore = Math.max(0, 20 - (stats.activeJobs / maxJobs) * 20);
    if (stats.activeJobs === 0) reasons.push("No active jobs");
    else if (stats.activeJobs <= 3) reasons.push(`${stats.activeJobs} active job${stats.activeJobs > 1 ? "s" : ""}`);
    else if (stats.activeJobs < maxJobs) {
      reasons.push(`${stats.activeJobs} active jobs`);
    } else {
      warnings.push(`${stats.activeJobs} active jobs (at capacity)`);
    }

    // ── Revenue balance (0-10): PM with lower total revenue gets higher score ──
    const allPmRevenues = Array.from(pmStats.values()).map((s) => s.totalRevenue);
    const maxRevenue = Math.max(...allPmRevenues, 1);
    scoreBreakdown.revenueBalance = Math.max(0, 10 - (stats.totalRevenue / maxRevenue) * 10);

    // ── Geographic cluster (0-10): PM already has jobs within same zone this week ──
    if (stats.jobsInZone > 0) {
      scoreBreakdown.geographicCluster = 10;
      reasons.push(`${stats.jobsInZone} job${stats.jobsInZone > 1 ? "s" : ""} in ${jobZoneName}`);
    }

    const totalScore = Object.values(scoreBreakdown).reduce((a, b) => a + b, 0);
    const maxPossible = 40 + 25 + 20 + 10 + 10; // 105
    const score = Math.round((totalScore / maxPossible) * 100);

    // Build explanation
    let explanation = "";
    if (scoreBreakdown.territoryMatch > 0) {
      if (scoreBreakdown.isPrimary > 0) {
        explanation = `Suggested PM: ${pm.name} because this job is in ${primaryTerr?.name} where ${pm.name} is the primary PM. He has ${stats.activeJobs} active jobs and $${stats.totalRevenue.toLocaleString()} in revenue.`;
      } else {
        explanation = `Suggested PM: ${pm.name} because this job is in ${backupTerr?.name} where ${pm.name} is the backup PM.`;
      }
    } else {
      // Check if primary PM is overloaded
      const primaryPM = PM_ROSTER.find((p) => {
        const terr = territories.find((t) => t.primaryPmEmail?.includes(p.name));
        return terr !== undefined;
      });
      if (primaryPM) {
        const primaryStats = pmStats.get(primaryPM.recordId);
        if (primaryStats && primaryStats.activeJobs > 10) {
          explanation = `Suggested PM: ${pm.name} because the primary PM is overloaded. ${pm.name} has ${stats.activeJobs} active jobs.`;
        }
      }
    }

    if (!explanation) {
      explanation = `Suggested PM: ${pm.name}. Currently has ${stats.activeJobs} active jobs and $${stats.totalRevenue.toLocaleString()} in revenue.`;
    }

    return {
      pmEmail: pm.name.toLowerCase().replace(" ", ".") + "@provisionpaints.com",
      pmName: pm.name,
      pmRecordId: pm.recordId,
      score,
      scoreBreakdown,
      reasons,
      warnings,
      activeJobCount: stats.activeJobs,
      isCurrentPM: job.pmName === pm.name,
      isRecommended: false,
      explanation,
    };
  });

  // Sort by score descending
  suggestions.sort((a, b) => b.score - a.score);
  if (suggestions.length > 0) suggestions[0].isRecommended = true;

  return suggestions;
}

/**
 * Determine if a job is ready to schedule, and what blockers/missing items exist.
 */
export function determineSchedulingReadiness(
  job: PipelineJob
): {
  readiness: SchedulingReadiness;
  missingItems: string[];
  blockingItems: string[];
} {
  const missingItems: string[] = [];
  const blockingItems: string[] = [];

  // Check for missing critical info
  if (!job.address) blockingItems.push("No address");
  if (!job.value && job.value !== 0) blockingItems.push("No job value");
  if (!job.estimatedHours && job.estimatedHours !== 0) blockingItems.push("No budgeted hours");

  // Check crew status
  if (!job.crew && (job.productionStage === "Scheduled" || job.productionStage === "In Progress")) {
    blockingItems.push("No crew assigned");
  }

  // Check color status
  if (job.colorStatus === "Not Started" && job.startDate) {
    const daysUntilStart = Math.floor(
      (new Date(job.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilStart <= 14) {
      blockingItems.push("Color selection not started (starts soon)");
    } else {
      missingItems.push("Color selection not started");
    }
  }

  // Check material status
  if ((job.materialStatus === "Not Ordered" || job.materialStatus === "Backordered") && job.startDate) {
    const daysUntilStart = Math.floor(
      (new Date(job.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilStart <= 7) {
      blockingItems.push("Materials not ordered (starts within 7 days)");
    } else {
      missingItems.push("Materials not ordered");
    }
  }

  // Determine readiness
  let readiness: SchedulingReadiness = "needs-review";

  if (blockingItems.length > 0) {
    if (blockingItems.some((b) => b.includes("crew"))) readiness = "missing-crew";
    else if (blockingItems.some((b) => b.includes("Color"))) readiness = "missing-colors";
    else if (blockingItems.some((b) => b.includes("Materials"))) readiness = "missing-materials";
    else if (blockingItems.some((b) => b.includes("address"))) readiness = "missing-info";
  } else if (missingItems.length === 0 && job.crew && job.pmId) {
    readiness = "ready";
  } else if (missingItems.length > 0) {
    readiness = "needs-review";
  }

  return { readiness, missingItems, blockingItems };
}

// ─── Start date prediction ─────────────────────────────────────────────────

export interface StartDatePrediction {
  /** ISO date string "YYYY-MM-DD" */
  suggestedDate: string;
  /** "Mon, Jan 15" */
  suggestedDateFormatted: string;
  /** "Week of Jan 15" */
  weekLabel: string;
  /** How confident based on data availability */
  confidence: "high" | "medium" | "low";
  /** Human-readable explanation */
  reason: string;
  /** Calendar days from today */
  daysFromNow: number;
}

/**
 * Predict the earliest realistic start date for a pending job.
 *
 * Strategy:
 *  1. Find all active (non-completed) jobs assigned to the suggested PM
 *  2. Take the latest endDate among those jobs — that's when they'll be free
 *  3. Add a 3-day buffer for materials / coordination
 *  4. Round forward to the next Monday (start of work week)
 *  5. Enforce a minimum of 10 days from today (lead time floor)
 */
export function predictStartDate(
  _job: PipelineJob,
  allJobs: PipelineJob[],
  suggestedPmName: string | null
): StartDatePrediction {
  const BUFFER_DAYS   = 3;   // days gap after last job ends
  const MIN_LEAD_DAYS = 10;  // never suggest sooner than 10 days out

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const BUSY_STAGES = new Set([
    "Needs Confirmation", "Scheduled", "Materials Needed",
    "Ready to Start", "In Progress", "Final Walkthrough",
  ]);

  // Find active jobs for this PM
  const pmJobs = suggestedPmName
    ? allJobs.filter(
        (j) =>
          j.pmName === suggestedPmName &&
          BUSY_STAGES.has(j.productionStage)
      )
    : [];

  // Latest end date across PM's active jobs
  let latestEnd: Date = new Date(today);
  for (const j of pmJobs) {
    if (!j.endDate) continue;
    const d = new Date(j.endDate + "T00:00:00");
    if (d > latestEnd) latestEnd = d;
  }

  // Add buffer
  const candidate = new Date(latestEnd);
  candidate.setDate(candidate.getDate() + BUFFER_DAYS);

  // Round up to next Monday
  const dow = candidate.getDay(); // 0=Sun 1=Mon … 6=Sat
  if (dow !== 1) {
    const add = dow === 0 ? 1 : 8 - dow;
    candidate.setDate(candidate.getDate() + add);
  }

  // Enforce minimum lead time
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + MIN_LEAD_DAYS);
  // round minDate up to Monday too
  const minDow = minDate.getDay();
  if (minDow !== 1) {
    const add = minDow === 0 ? 1 : 8 - minDow;
    minDate.setDate(minDate.getDate() + add);
  }

  const finalDate = candidate > minDate ? candidate : minDate;

  const daysFromNow = Math.round(
    (finalDate.getTime() - today.getTime()) / 86_400_000
  );

  const suggestedDate = finalDate.toISOString().split("T")[0];

  const suggestedDateFormatted = finalDate.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });

  const weekLabel =
    "Week of " +
    finalDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  let confidence: "high" | "medium" | "low";
  let reason: string;

  if (!suggestedPmName) {
    confidence = "low";
    reason = "No PM assigned — assign a PM for a better estimate";
  } else if (pmJobs.length === 0) {
    confidence = "medium";
    reason = `${suggestedPmName} has no scheduled jobs — earliest open slot`;
  } else {
    const jobWithLatestEnd = pmJobs
      .filter((j) => j.endDate)
      .sort((a, b) =>
        new Date(b.endDate!).getTime() - new Date(a.endDate!).getTime()
      )[0];
    confidence = "high";
    reason = `After ${suggestedPmName}'s ${pmJobs.length} active job${pmJobs.length !== 1 ? "s" : ""}${
      jobWithLatestEnd?.endDate
        ? ` (last ends ${new Date(jobWithLatestEnd.endDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })})`
        : ""
    }`;
  }

  return {
    suggestedDate,
    suggestedDateFormatted,
    weekLabel,
    confidence,
    reason,
    daysFromNow,
  };
}
