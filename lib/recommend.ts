/**
 * Crew + PM recommendation engine for ProVision Production.
 *
 * All logic runs pure client-side — no extra API calls.
 * Inputs: the job being scheduled, the full crews list, all active pipeline jobs.
 * Outputs: ranked recommendations with scores and human-readable reasons.
 */

import type { PipelineJob, Crew } from "./types";

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
 * Known PMs and their Airtable People record IDs.
 * Colin Colby left — removed.
 * Ali added as placeholder — update name/recordId once confirmed.
 */
const PM_ROSTER = [
  { name: "Nico Lawler",     recordId: "recIWuHhrhcJvOCIM" },
  { name: "Tyler Grodivant", recordId: "recsAsvt9rVtOdN7w" },
  // TODO: update Ali's full DripJobs name and Airtable record ID
  { name: "Ali",             recordId: "recAliPlaceholder0001" },
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
