export const dynamic = "force-dynamic";

import Link from "next/link";
import { getActivePipelineJobs, getCrews, getMonthlyGoal } from "@/lib/airtable";
import { PipelineBoard } from "@/components/PipelineBoard";
import { ScheduleBoard } from "@/components/ScheduleBoard";
import { authOptions, roleFor, pmRecordId } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { Kanban, CalendarRange } from "lucide-react";
import type { PipelineJob } from "@/lib/types";

type Tab = "pipeline" | "calendar";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tab: Tab = searchParams?.tab === "calendar" ? "calendar" : "pipeline";

  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const role = roleFor(email);
  const myPmRecordId = pmRecordId(email);

  const now = new Date();
  const [allJobs, crews, monthGoal] = await Promise.all([
    getActivePipelineJobs().catch(() => []),
    getCrews().catch(() => []),
    getMonthlyGoal(now.getFullYear(), now.getMonth() + 1).catch(() => null),
  ]);

  const jobs: PipelineJob[] = role === "pm" && myPmRecordId
    ? allJobs.filter(j => j.pmId === myPmRecordId)
    : allJobs;

  const crewColors: Record<string, string> = {};
  for (const c of crews) {
    if (c.color) crewColors[c.name] = c.color;
  }

  const weeklyTarget = monthGoal?.productionGoal
    ? Math.round(monthGoal.productionGoal / 4.33)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="section-label mb-0.5">Production</div>
          <h1 className="page-header">Jobs</h1>
          <p className="text-sm text-provision-gray-text mt-0.5">
            {jobs.length} active jobs · {jobs.filter(j => j.productionStage === "In Progress").length} in progress
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-provision-gray rounded-xl p-1 w-fit">
        {([
          { id: "pipeline" as Tab, label: "Pipeline", icon: <Kanban className="w-4 h-4" /> },
          { id: "calendar" as Tab, label: "Calendar", icon: <CalendarRange className="w-4 h-4" /> },
        ]).map(({ id, label, icon }) => (
          <Link
            key={id}
            href={`/jobs?tab=${id}`}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wide transition-all ${
              tab === id
                ? "bg-white text-provision-charcoal shadow-card"
                : "text-provision-gray-text hover:text-provision-charcoal"
            }`}
          >
            {icon}
            {label}
          </Link>
        ))}
      </div>

      {tab === "pipeline" && (
        <PipelineBoard jobs={jobs} crews={crews} role={role} />
      )}

      {tab === "calendar" && (
        <div>
          {jobs.filter(j => j.startDate).length === 0 ? (
            <div className="card text-center py-10 space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/huey-mascot.png" alt="Huey" className="w-16 h-18 object-contain mx-auto opacity-60" />
              <div className="font-display font-black text-provision-navy uppercase">Calendar Ready</div>
              <p className="text-provision-gray-text text-sm max-w-xs mx-auto">
                Jobs will appear here once start dates are added. Schedule jobs from Home → Pending Queue.
              </p>
            </div>
          ) : (
            <ScheduleBoard jobs={[]} crewColors={crewColors} weeklyTarget={weeklyTarget} />
          )}
        </div>
      )}
    </div>
  );
}
