export const dynamic = "force-dynamic";
import { getCrews, getProductionJobs, getDJActiveJobs } from "@/lib/airtable";
import type { ProductionStage, ProductionJob } from "@/lib/types";
import { CapacityGantt } from "@/components/CapacityGantt";
import type { GanttJob } from "@/components/CapacityGantt";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  CalendarDays,
  Users,
} from "lucide-react";

// ─── Constants ─────────────────────────────────────────────────────────────

/** Stages that count as active workload */
const ACTIVE_STAGES: ProductionStage[] = [
  "Needs Confirmation",
  "Scheduled",
  "Materials Needed",
  "Ready to Start",
  "In Progress",
  "Final Walkthrough",
];

/** Soft cap (hours) for flagging "near limit" */
const SOFT_CAP = 80;

const COLOR_MAP: Record<string, string> = {
  Plum: "#6B3FA0", Purple: "#9333EA", Yellow: "#EAB308", Tomato: "#EF4444",
  Gold: "#CA8A04", Orange: "#F57C1F", Buttercream: "#D4A017", Periwinkle: "#818CF8",
  Pink: "#EC4899", Turquoise: "#06B6D4", Mint: "#22C55E", Blush: "#F9A8D4",
  Red: "#DC2626", Thistle: "#A855F7", "Dark Blue": "#1E3A8A", Green: "#16A34A",
  "Sky Blue": "#38BDF8", Teal: "#14B8A6", "Light Blue": "#93C5FD", Gray: "#9CA3AF",
  Seafoam: "#5EEAD4", Salmon: "#FB923C",
};

function hexFor(color: string | null) {
  return color ? COLOR_MAP[color] ?? "#9CA3AF" : "#9CA3AF";
}

function money(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Conflict detection ────────────────────────────────────────────────────

/**
 * Returns the set of Production job IDs that have overlapping date ranges
 * with another job assigned to the same crew.
 */
function detectConflicts(
  jobs: { id: string; crew: string | null; startDate: string | null; endDate: string | null }[]
): Set<string> {
  const conflicts = new Set<string>();
  const byCrew = new Map<string, typeof jobs>();

  for (const j of jobs) {
    if (!j.crew || !j.startDate || !j.endDate) continue;
    if (!byCrew.has(j.crew)) byCrew.set(j.crew, []);
    byCrew.get(j.crew)!.push(j);
  }

  for (const [, crewJobs] of byCrew) {
    const sorted = [...crewJobs].sort((a, b) =>
      (a.startDate ?? "").localeCompare(b.startDate ?? "")
    );
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      // Overlap when one job's end is after the next job's start
      if ((a.endDate ?? "") > (b.startDate ?? "")) {
        conflicts.add(a.id);
        conflicts.add(b.id);
      }
    }
  }
  return conflicts;
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default async function CapacityPage() {
  const today = todayStr();

  const [crews, prodJobs, djJobs] = await Promise.all([
    getCrews().catch(() => []),
    getProductionJobs().catch(() => []),
    getDJActiveJobs().catch(() => []),
  ]);

  // ── Hours lookup: DJ Jobs are the primary hours source ──────────────────
  //
  // Production jobs link to Deals via dealId.
  // DJ Jobs also link to the same Deal and carry estLaborHours from DripJobs.
  // This is more reliably filled in than Deal.budgetedHours.
  //
  const hoursFromDJ = new Map<string, number>(); // dealId → estLaborHours
  const valueFromDJ = new Map<string, number>(); // dealId → revenue
  for (const dj of djJobs) {
    if (dj.dealId && dj.estLaborHours) hoursFromDJ.set(dj.dealId, dj.estLaborHours);
    if (dj.dealId && dj.revenue)       valueFromDJ.set(dj.dealId, dj.revenue);
  }

  // ── Build per-crew stats ────────────────────────────────────────────────

  type CrewStats = {
    name: string;
    color: string | null;
    scheduledHours: number;
    scheduledValue: number;
    activeJobs: number;
    jobs: ProductionJob[];
    hoursSource: "dj" | "none";
  };

  const crewMap = new Map<string, CrewStats>();

  // Seed from Crews table (so available crews show up even with no jobs)
  for (const c of crews) {
    crewMap.set(c.name, {
      name: c.name,
      color: c.color,
      scheduledHours: 0,
      scheduledValue: 0,
      activeJobs: 0,
      jobs: [],
      hoursSource: "none",
    });
  }

  for (const j of prodJobs) {
    if (!j.crew || !ACTIVE_STAGES.includes(j.stage as ProductionStage)) continue;
    if (!crewMap.has(j.crew)) {
      crewMap.set(j.crew, {
        name: j.crew, color: null,
        scheduledHours: 0, scheduledValue: 0,
        activeJobs: 0, jobs: [], hoursSource: "none",
      });
    }
    const stats = crewMap.get(j.crew)!;
    stats.activeJobs++;
    stats.jobs.push(j);

    if (j.dealId) {
      const h = hoursFromDJ.get(j.dealId);
      const v = valueFromDJ.get(j.dealId);
      if (h) { stats.scheduledHours += h; stats.hoursSource = "dj"; }
      if (v) stats.scheduledValue += v;
    }

    // Also count for crew2 (split job)
    if (j.crew2) {
      if (!crewMap.has(j.crew2)) {
        crewMap.set(j.crew2, {
          name: j.crew2, color: null,
          scheduledHours: 0, scheduledValue: 0,
          activeJobs: 0, jobs: [], hoursSource: "none",
        });
      }
      const stats2 = crewMap.get(j.crew2)!;
      stats2.activeJobs++;
      if (j.dealId) {
        const h = hoursFromDJ.get(j.dealId);
        if (h) stats2.scheduledHours += Math.ceil(h / 2); // split hours in half
      }
    }
  }

  // ── Conflict detection ─────────────────────────────────────────────────
  const conflictIds = detectConflicts(prodJobs);

  // ── Gantt data ─────────────────────────────────────────────────────────
  const ganttJobs: GanttJob[] = prodJobs
    .filter((j) => j.crew && j.startDate && j.endDate && ACTIVE_STAGES.includes(j.stage as ProductionStage))
    .map((j) => {
      const crewColor = crewMap.get(j.crew!)?.color ?? null;
      return {
        id:          j.id,
        name:        j.job,
        crewName:    j.crew!,
        crewColor,
        startDate:   j.startDate!,
        endDate:     j.endDate!,
        hours:       j.dealId ? (hoursFromDJ.get(j.dealId) ?? null) : null,
        stage:       j.stage ?? "",
        value:       j.dealId ? (valueFromDJ.get(j.dealId) ?? null) : null,
        hasConflict: conflictIds.has(j.id),
      };
    });

  // ── Aggregate KPIs ────────────────────────────────────────────────────
  const activeList = [...crewMap.values()].filter((c) => c.activeJobs > 0);
  const totalHours = activeList.reduce((s, c) => s + c.scheduledHours, 0);
  const totalValue = activeList.reduce((s, c) => s + c.scheduledValue, 0);
  const overCap    = activeList.filter((c) => c.scheduledHours > SOFT_CAP).length;
  const conflicts  = conflictIds.size;

  const unassigned = prodJobs.filter(
    (j) => !j.crew && ACTIVE_STAGES.includes(j.stage as ProductionStage)
  );

  // Jobs with no hours estimate at all (helps surface the data gap)
  const noHoursCount = prodJobs.filter(
    (j) => j.crew && ACTIVE_STAGES.includes(j.stage as ProductionStage) && j.dealId && !hoursFromDJ.get(j.dealId)
  ).length;

  // Sorted for the load bars: overloaded first, then by hours desc
  const sortedCrews = activeList.sort((a, b) => {
    const aOver = a.scheduledHours > SOFT_CAP ? 1 : 0;
    const bOver = b.scheduledHours > SOFT_CAP ? 1 : 0;
    if (aOver !== bOver) return bOver - aOver;
    return b.scheduledHours - a.scheduledHours;
  });

  const maxHours = Math.max(SOFT_CAP, ...sortedCrews.map((c) => c.scheduledHours));
  const maxValue = Math.max(1, ...sortedCrews.map((c) => c.scheduledValue));

  const availableCrews = [...crewMap.values()].filter((c) => c.activeJobs === 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-provision-charcoal-dark">Capacity</h1>
        <p className="text-sm text-provision-gray-text">
          Crew workload, scheduling conflicts, and timeline — next 12 weeks
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            Icon: Clock,
            label: "Scheduled hours",
            val: totalHours > 0 ? `${totalHours}h` : "—",
            sub: totalHours > 0 ? "from DJ Jobs estimates" : "No hours data yet",
            cls: "bg-blue-50 text-blue-600",
          },
          {
            Icon: DollarSign,
            label: "Pipeline value",
            val: totalValue > 0 ? money(totalValue) : "—",
            sub: "active + upcoming jobs",
            cls: "bg-provision-orange-light text-provision-orange-dark",
          },
          {
            Icon: AlertTriangle,
            label: "Scheduling conflicts",
            val: String(conflictIds.size > 0 ? Math.floor(conflictIds.size / 2) : 0),
            sub: conflicts > 0 ? "crews with overlapping dates" : "No conflicts detected",
            cls: conflicts > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600",
          },
          {
            Icon: Users,
            label: "Over capacity",
            val: String(overCap),
            sub: overCap > 0 ? `above ${SOFT_CAP}h soft cap` : "All crews within capacity",
            cls: overCap > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600",
          },
        ].map((k) => (
          <div key={k.label} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-provision-gray-text uppercase tracking-wide">
                  {k.label}
                </div>
                <div className="text-2xl font-semibold text-provision-charcoal-dark mt-1">
                  {k.val}
                </div>
                <div className="text-xs text-provision-gray-text mt-0.5">{k.sub}</div>
              </div>
              <div className={`w-10 h-10 rounded-md flex items-center justify-center ${k.cls}`}>
                <k.Icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hours data warning */}
      {noHoursCount > 0 && (
        <div className="flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-md px-4 py-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>{noHoursCount} active job{noHoursCount !== 1 ? "s" : ""}</strong> have
            no hours estimate in DripJobs — capacity numbers will be understated until "Est.
            Labor Hours" is filled in on those work orders.
          </span>
        </div>
      )}

      {/* ── Timeline (Gantt) ──────────────────────────────────────────── */}
      <section className="card">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="w-4 h-4 text-provision-orange-dark" />
          <h2 className="font-semibold text-provision-charcoal-dark">
            Schedule Timeline
          </h2>
          <span className="text-xs text-provision-gray-text ml-1">
            — next 12 weeks · hover a bar for details
          </span>
        </div>
        <CapacityGantt jobs={ganttJobs} todayStr={today} />
      </section>

      {/* ── Crew load bars ────────────────────────────────────────────── */}
      <section className="card">
        <h2 className="font-semibold text-provision-charcoal-dark mb-1">
          Crew load
        </h2>
        <p className="text-xs text-provision-gray-text mb-5">
          Hours from DripJobs estimates · {SOFT_CAP}h soft cap
        </p>

        {sortedCrews.length === 0 ? (
          <p className="text-sm text-provision-gray-text italic">
            No crews have active jobs yet.
          </p>
        ) : (
          <div className="space-y-5">
            {sortedCrews.map((c) => {
              const hex    = hexFor(c.color);
              const hPct   = maxHours > 0 ? Math.min((c.scheduledHours / maxHours) * 100, 100) : 0;
              const vPct   = maxValue > 0 ? Math.min((c.scheduledValue / maxValue) * 100, 100) : 0;
              const over   = c.scheduledHours > SOFT_CAP;
              const warn   = c.scheduledHours > SOFT_CAP * 0.8;
              const hColor = over ? "bg-red-500" : warn ? "bg-yellow-400" : "bg-green-500";
              const crewConflicts = c.jobs.filter((j) => conflictIds.has(j.id)).length;

              return (
                <div key={c.name}>
                  {/* Row header */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-4 h-4 rounded shrink-0" style={{ backgroundColor: hex }} />
                    <span className="font-medium text-sm text-provision-charcoal-dark flex-1 truncate">
                      {c.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {crewConflicts > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {crewConflicts} conflict{crewConflicts !== 1 ? "s" : ""}
                        </span>
                      )}
                      <CapacityBadge hours={c.scheduledHours} cap={SOFT_CAP} />
                    </div>
                  </div>

                  <div className="space-y-1.5 ml-7">
                    {/* Hours bar */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-provision-gray-text w-10 shrink-0">
                        Hours
                      </span>
                      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${hColor}`}
                          style={{ width: `${hPct}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-semibold w-20 text-right ${
                          over ? "text-red-600" : "text-provision-charcoal-dark"
                        }`}
                      >
                        {c.scheduledHours > 0 ? `${c.scheduledHours}h` : "—"}
                        {over && ` (+${c.scheduledHours - SOFT_CAP}h over)`}
                      </span>
                    </div>

                    {/* Value bar */}
                    {c.scheduledValue > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-provision-gray-text w-10 shrink-0">
                          Value
                        </span>
                        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-provision-orange/50"
                            style={{ width: `${vPct}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-provision-charcoal-dark w-20 text-right">
                          {money(c.scheduledValue)}
                        </span>
                      </div>
                    )}

                    {/* Job chips */}
                    {c.jobs.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {c.jobs.map((j) => (
                          <span
                            key={j.id}
                            className={`text-[10px] rounded px-1.5 py-0.5 border ${
                              conflictIds.has(j.id)
                                ? "bg-red-50 border-red-300 text-red-700 font-medium"
                                : "bg-gray-50 border-provision-gray-mid text-provision-charcoal"
                            }`}
                            title={j.startDate && j.endDate ? `${j.startDate} → ${j.endDate}` : undefined}
                          >
                            {conflictIds.has(j.id) && "⚠ "}
                            {j.job}
                            {j.startDate ? ` · ${j.startDate}` : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Unassigned jobs ───────────────────────────────────────────── */}
      {unassigned.length > 0 && (
        <section className="card border-l-4 border-yellow-400">
          <h2 className="font-semibold text-provision-charcoal-dark mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Needs crew assigned ({unassigned.length})
          </h2>
          <div className="space-y-1.5">
            {unassigned.map((j) => {
              const hrs = j.dealId ? hoursFromDJ.get(j.dealId) : null;
              return (
                <div
                  key={j.id}
                  className="flex items-center justify-between text-sm py-1.5 border-b border-provision-gray-mid last:border-0"
                >
                  <div>
                    <span className="font-medium">{j.job}</span>
                    {hrs && (
                      <span className="text-provision-gray-text ml-2 text-xs">{hrs}h est.</span>
                    )}
                    {j.startDate && (
                      <span className="text-provision-gray-text ml-2 text-xs">
                        starts {j.startDate}
                      </span>
                    )}
                  </div>
                  <span className="pill bg-gray-100 text-gray-600 text-xs">{j.stage}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Available crews ───────────────────────────────────────────── */}
      {availableCrews.length > 0 && (
        <section className="card">
          <h2 className="font-semibold text-provision-charcoal-dark mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Available — no active jobs ({availableCrews.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {availableCrews.map((c) => {
              const hex = hexFor(c.color);
              return (
                <div
                  key={c.name}
                  className="flex items-center gap-2 bg-gray-50 border border-provision-gray-mid rounded-md px-3 py-1.5 text-sm"
                >
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: hex }} />
                  <span>{c.name}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function CapacityBadge({ hours, cap }: { hours: number; cap: number }) {
  if (hours === 0)
    return <span className="pill bg-gray-100 text-gray-500 text-[10px]">No data</span>;
  if (hours > cap)
    return (
      <span className="pill bg-red-100 text-red-700 text-[10px] flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" /> Overloaded
      </span>
    );
  if (hours > cap * 0.8)
    return <span className="pill bg-yellow-100 text-yellow-700 text-[10px]">Near limit</span>;
  return <span className="pill bg-green-100 text-green-700 text-[10px]">Has capacity</span>;
}
