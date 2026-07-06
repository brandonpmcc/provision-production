export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getJobsForCrew } from "@/lib/airtable";
import { Calendar, Clock } from "lucide-react";

function fmt(d: string | null) {
  if (!d) return "TBD";
  return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function fmtFull(d: string | null) {
  if (!d) return "TBD";
  return new Date(d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export default async function ContractorSchedulePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "contractor") redirect("/contractor-login");
  const crewName = (session.user as { name?: string }).name ?? "";
  const jobs = await getJobsForCrew(crewName).catch(() => []);
  const withDates = jobs.filter((j) => j.startDate).sort((a, b) =>
    new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime()
  );

  // Group by ISO week
  const byWeek = new Map<string, typeof withDates>();
  for (const job of withDates) {
    const d = new Date(job.startDate!);
    const yr = d.getFullYear();
    const wk = Math.ceil(((d.getTime() - new Date(yr, 0, 1).getTime()) / 86400000 + new Date(yr, 0, 1).getDay() + 1) / 7);
    const key = `${yr}-W${String(wk).padStart(2, "0")}`;
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key)!.push(job);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-provision-charcoal-dark">Schedule</h1>
        <p className="text-sm text-provision-gray-text">Your upcoming jobs by week</p>
      </div>

      {withDates.length === 0 ? (
        <div className="card text-center py-10">
          <Calendar className="w-10 h-10 text-provision-gray-text mx-auto mb-3" />
          <p className="text-provision-gray-text">No scheduled jobs at this time.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(byWeek.entries()).map(([key, weekJobs]) => {
            const monday = new Date(weekJobs[0].startDate!);
            const day = monday.getDay();
            monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
            return (
              <div key={key}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-px bg-provision-gray-mid" />
                  <span className="text-xs font-semibold text-provision-charcoal-dark uppercase tracking-wide">
                    Week of {monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <div className="flex-1 h-px bg-provision-gray-mid" />
                </div>
                <div className="space-y-2">
                  {weekJobs.map((job) => (
                    <div key={job.id} className="card hover:shadow-card-hover transition">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <h3 className="font-semibold text-provision-charcoal-dark">{job.job}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-provision-orange/20 text-provision-orange font-medium">
                          {job.stage || "Scheduled"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-provision-gray-text">
                        <Clock className="w-3 h-3 text-provision-orange" />
                        {fmtFull(job.startDate)}{job.endDate ? ` → ${fmt(job.endDate)}` : ""}
                      </div>
                      {job.notes && <div className="mt-2 p-2 bg-provision-gray rounded text-xs text-provision-gray-text">{job.notes}</div>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
