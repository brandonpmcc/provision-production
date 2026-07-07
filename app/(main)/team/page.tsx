export const dynamic = "force-dynamic";

import Link from "next/link";
import { getCrews, getProductionJobs, getDJActiveJobs, getPmStats, getActivePipelineJobs } from "@/lib/airtable";
import type { CrewHealth, ProductionStage } from "@/lib/types";
import { CrewCard } from "@/components/CrewCard";
import { PMJobsPanel } from "./PMJobsPanel";
import { Star, Briefcase, Clock, Users, BarChart2, ChevronRight } from "lucide-react";

// ─── Shared helpers ────────────────────────────────────────────────────────

const ACTIVE_STAGES: ProductionStage[] = [
  "Scheduled", "Materials Needed", "Ready to Start", "In Progress",
  "Needs Confirmation", "Final Walkthrough",
];

const avg = (vals: (number | null)[]): number | null => {
  const v = vals.filter((x): x is number => x != null);
  return v.length ? Math.round((v.reduce((a, b) => a + b) / v.length) * 10) / 10 : null;
};

function money(n: number | null | undefined) {
  if (n == null) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

// ─── Tab bar ────────────────────────────────────────────────────────────────

type Tab = "crews" | "pm" | "capacity";

function TabBar({ active }: { active: Tab }) {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "crews",    label: "Crews",       icon: <Star className="w-4 h-4" /> },
    { id: "pm",       label: "PM Workload", icon: <Users className="w-4 h-4" /> },
    { id: "capacity", label: "Capacity",    icon: <BarChart2 className="w-4 h-4" /> },
  ];

  return (
    <div className="flex gap-1 bg-provision-gray rounded-xl p-1 w-fit">
      {tabs.map(({ id, label, icon }) => (
        <Link
          key={id}
          href={`/team?tab=${id}`}
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

// ─── Crews tab ─────────────────────────────────────────────────────────────

async function CrewsTab() {
  const [crews, jobs, djJobs] = await Promise.all([
    getCrews().catch(() => []),
    getProductionJobs().catch(() => []),
    getDJActiveJobs().catch(() => []),
  ]);

  const hoursByDealId = new Map<string, number>();
  for (const dj of djJobs) {
    if (dj.dealId && dj.estLaborHours) hoursByDealId.set(dj.dealId, dj.estLaborHours);
  }

  const crewJobMap = new Map<string, typeof jobs[number][]>();
  for (const j of jobs) {
    if (!j.crew || !ACTIVE_STAGES.includes(j.stage as ProductionStage)) continue;
    if (!crewJobMap.has(j.crew)) crewJobMap.set(j.crew, []);
    crewJobMap.get(j.crew)!.push(j);
  }

  const health: CrewHealth[] = crews.map((c) => {
    const crewJobs = crewJobMap.get(c.name) ?? [];
    const scored = crewJobs.filter((j) => j.scoreAvg != null);
    const hours = crewJobs.reduce(
      (s, j) => s + (j.dealId ? (hoursByDealId.get(j.dealId) ?? 0) : 0), 0
    );
    return {
      crewName:         c.name,
      color:            c.color,
      totalJobs:        crewJobs.length,
      scoredJobs:       scored.length,
      avgOnTime:        avg(scored.map((j) => j.scoreOnTime)),
      avgCustomerSat:   avg(scored.map((j) => j.scoreCustomerSat)),
      avgCommunication: avg(scored.map((j) => j.scoreCommunication)),
      avgOverall:       avg(scored.map((j) => j.scoreAvg)),
      activeJobs:       crewJobs.length,
      scheduledHours:   hours,
    };
  });

  const totalScoredJobs = health.reduce((s, h) => s + h.scoredJobs, 0);
  const totalActiveJobs = health.reduce((s, h) => s + h.activeJobs, 0);
  const totalHours = health.reduce((s, h) => s + h.scheduledHours, 0);

  const sortedCrews = [...crews].sort((a, b) => {
    const aJ = crewJobMap.get(a.name)?.length || 0;
    const bJ = crewJobMap.get(b.name)?.length || 0;
    return bJ - aJ || a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-5">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: <Star className="w-4 h-4" />,      label: "Rated jobs",     val: totalScoredJobs,  color: "text-green-600 bg-green-50" },
          { icon: <Briefcase className="w-4 h-4" />, label: "Active jobs",    val: totalActiveJobs,  color: "text-blue-600 bg-blue-50" },
          { icon: <Clock className="w-4 h-4" />,     label: "Scheduled hrs",  val: `${totalHours}h`, color: "text-provision-orange bg-provision-orange-light" },
        ].map((k) => (
          <div key={k.label} className="card flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${k.color}`}>
              {k.icon}
            </div>
            <div>
              <div className="text-[11px] text-provision-gray-text uppercase tracking-wide font-medium">{k.label}</div>
              <div className="text-2xl font-bold text-provision-navy leading-tight">{k.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Crew cards grid */}
      <div className="grid grid-cols-2 gap-4">
        {sortedCrews.map((c) => (
          <CrewCard
            key={c.id}
            crew={c}
            health={new Map(health.map((h) => [h.crewName, h])).get(c.name)}
            activeJobs={crewJobMap.get(c.name) || []}
          />
        ))}
      </div>
    </div>
  );
}

// ─── PM Workload tab ────────────────────────────────────────────────────────

async function PMTab() {
  const [pmStats, allJobs] = await Promise.all([
    getPmStats().catch(() => []),
    getActivePipelineJobs().catch(() => []),
  ]);

  const totalActiveJobs = pmStats.reduce((s, p) => s + p.activeJobs, 0);
  const totalRevenue    = pmStats.reduce((s, p) => s + p.totalRevenue, 0);
  const totalHours      = pmStats.reduce((s, p) => s + p.totalBudgetedHours, 0);
  const maxHours        = Math.max(...pmStats.map(p => p.totalBudgetedHours), 0);

  function statusColor(status: "healthy" | "busy" | "overloaded") {
    if (status === "overloaded") return "bg-red-100 text-red-700";
    if (status === "busy")       return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "PMs",          val: pmStats.length },
          { label: "Active jobs",  val: totalActiveJobs },
          { label: "Total revenue",val: money(totalRevenue) },
        ].map(k => (
          <div key={k.label} className="card">
            <div className="text-[11px] text-provision-gray-text uppercase tracking-wide font-medium mb-1">{k.label}</div>
            <div className="text-2xl font-bold text-provision-navy">{k.val}</div>
          </div>
        ))}
      </div>

      {/* PM cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {pmStats.map((pm) => {
          const capPct = maxHours > 0 ? Math.round((pm.totalBudgetedHours / (maxHours * 1.2)) * 100) : 0;
          return (
            <div key={pm.pmRecordId} className="card space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-provision-navy text-[15px]">{pm.pmName}</div>
                  <div className="text-xs text-provision-gray-text mt-0.5">{pm.activeJobs} active jobs</div>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusColor(pm.overloadStatus)}`}>
                  {pm.overloadStatus === "healthy" ? "Healthy" : pm.overloadStatus === "busy" ? "Busy" : "Overloaded"}
                </span>
              </div>

              {/* Revenue */}
              <div>
                <div className="flex justify-between text-xs text-provision-gray-text mb-1">
                  <span>Revenue</span>
                  <span className="font-semibold text-provision-navy">{money(pm.totalRevenue)}</span>
                </div>
              </div>

              {/* Hours capacity bar */}
              <div>
                <div className="flex justify-between text-xs text-provision-gray-text mb-1.5">
                  <span>Budgeted hours</span>
                  <span className="font-semibold text-provision-navy">{pm.totalBudgetedHours}h</span>
                </div>
                <div className="h-1.5 rounded-full bg-provision-gray-mid overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pm.overloadStatus === "overloaded" ? "bg-red-500" :
                      pm.overloadStatus === "busy" ? "bg-yellow-400" : "bg-provision-teal"
                    }`}
                    style={{ width: `${Math.min(capPct, 100)}%` }}
                  />
                </div>
              </div>

              {/* Job stage breakdown */}
              {pm.activeJobs > 0 && (
                <div className="pt-2 border-t border-provision-gray-mid space-y-1">
                  {pm.inProgressJobs > 0   && <div className="flex justify-between text-xs"><span className="text-provision-gray-text">In Progress</span><span className="font-medium">{pm.inProgressJobs}</span></div>}
                  {pm.scheduledJobs > 0    && <div className="flex justify-between text-xs"><span className="text-provision-gray-text">Scheduled</span><span className="font-medium">{pm.scheduledJobs}</span></div>}
                  {pm.pendingScheduleJobs > 0      && <div className="flex justify-between text-xs"><span className="text-provision-gray-text">Pending</span><span className="font-medium text-provision-orange">{pm.pendingScheduleJobs}</span></div>}
                </div>
              )}

              {/* Expandable job list */}
              <PMJobsPanel pmName={pm.pmName} jobs={allJobs} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Capacity tab (link-through to full page) ────────────────────────────────

function CapacityTab() {
  return (
    <div className="space-y-4">
      <div className="card text-center py-10 space-y-3">
        <BarChart2 className="w-10 h-10 text-provision-gray-muted mx-auto" />
        <div className="text-provision-navy font-semibold text-lg">Crew Capacity Gantt</div>
        <p className="text-provision-gray-text text-sm max-w-sm mx-auto">
          The interactive capacity timeline is best viewed in full screen with all date controls.
        </p>
        <Link
          href="/capacity"
          className="btn-primary inline-flex items-center gap-2"
        >
          Open Full Capacity View
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function TeamPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const rawTab = searchParams?.tab ?? "crews";
  const tab: Tab =
    rawTab === "pm" || rawTab === "capacity" ? rawTab : "crews";

  const tabTitle: Record<Tab, string> = {
    crews:    "Crews",
    pm:       "PM Workload",
    capacity: "Capacity",
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Team</h1>
          <p className="text-sm text-provision-gray-text mt-0.5">
            {tabTitle[tab]} — crew assignments, PM workload &amp; scheduling capacity
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <TabBar active={tab} />

      {/* Tab content */}
      {tab === "crews"    && <CrewsTab />}
      {tab === "pm"       && <PMTab />}
      {tab === "capacity" && <CapacityTab />}
    </div>
  );
}
