export const dynamic = "force-dynamic";
import { getCrews, getProductionJobs, getDJActiveJobs } from "@/lib/airtable";
import type { CrewHealth, ProductionStage } from "@/lib/types";
import { Star, Briefcase, Clock } from "lucide-react";
import { CrewCard } from "@/components/CrewCard";

const ACTIVE_STAGES: ProductionStage[] = [
  "Scheduled", "Materials Needed", "Ready to Start", "In Progress",
  "Needs Confirmation", "Final Walkthrough",
];

const avg = (vals: (number | null)[]): number | null => {
  const v = vals.filter((x): x is number => x != null);
  return v.length ? Math.round((v.reduce((a, b) => a + b) / v.length) * 10) / 10 : null;
};

export default async function CrewsPage() {
  const [crews, jobs, djJobs] = await Promise.all([
    getCrews().catch(() => []),
    getProductionJobs().catch(() => []),
    getDJActiveJobs().catch(() => []),
  ]);

  // Use DJ Jobs as the hours source (avoids empty-deals bug in computeCrewHealth)
  const hoursByDealId = new Map<string, number>();
  for (const dj of djJobs) {
    if (dj.dealId && dj.estLaborHours) hoursByDealId.set(dj.dealId, dj.estLaborHours);
  }

  // Build health stats from scratch using DJ Jobs hours
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

  // Active jobs per crew for the expand section
  const jobsByCrew = new Map<string, (typeof jobs)[number][]>();
  for (const j of jobs) {
    if (!j.crew || !ACTIVE_STAGES.includes(j.stage as ProductionStage)) continue;
    if (!jobsByCrew.has(j.crew)) jobsByCrew.set(j.crew, []);
    jobsByCrew.get(j.crew)!.push(j);
  }

  const totalScoredJobs = health.reduce((s, h) => s + h.scoredJobs, 0);
  const totalActiveJobs = health.reduce((s, h) => s + h.activeJobs, 0);
  const totalHours = health.reduce((s, h) => s + h.scheduledHours, 0);

  // Crews with active jobs first
  const sortedCrews = [...crews].sort((a, b) => {
    const aJ = jobsByCrew.get(a.name)?.length || 0;
    const bJ = jobsByCrew.get(b.name)?.length || 0;
    return bJ - aJ || a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-provision-charcoal-dark">Crew Health</h1>
        <p className="text-sm text-provision-gray-text">
          {crews.length} crews · {totalActiveJobs} active jobs · {totalScoredJobs} rated · {totalHours}h scheduled
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { Icon: Star,      label: "Rated jobs",      val: totalScoredJobs,       cls: "bg-green-50 text-green-600" },
          { Icon: Briefcase, label: "Active jobs",      val: totalActiveJobs,       cls: "bg-blue-50 text-blue-600" },
          { Icon: Clock,     label: "Scheduled hours",  val: `${totalHours}h`,      cls: "bg-provision-orange-light text-provision-orange-dark" },
        ].map((k) => (
          <div key={k.label} className="card flex items-center gap-3">
            <div className={`w-10 h-10 rounded-md flex items-center justify-center ${k.cls}`}><k.Icon className="w-5 h-5" /></div>
            <div>
              <div className="text-xs text-provision-gray-text">{k.label}</div>
              <div className="text-xl font-semibold text-provision-charcoal-dark">{k.val}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {sortedCrews.map((c) => (
          <CrewCard
            key={c.id}
            crew={c}
            health={new Map(health.map((h) => [h.crewName, h])).get(c.name)}
            activeJobs={jobsByCrew.get(c.name) || []}
          />
        ))}
      </div>
    </div>
  );
}
