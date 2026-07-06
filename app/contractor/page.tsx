export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getJobsForCrew } from "@/lib/airtable";
import type { ProductionJob } from "@/lib/types";
import { MapPin, Calendar, Briefcase } from "lucide-react";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "TBD";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function stageColor(stage: string | null): string {
  const m: Record<string, string> = {
    "Pending Schedule": "bg-yellow-100 text-yellow-700",
    "Needs Confirmation": "bg-blue-100 text-blue-700",
    "Scheduled": "bg-blue-100 text-blue-700",
    "Materials Needed": "bg-purple-100 text-purple-700",
    "Ready to Start": "bg-orange-100 text-orange-700",
    "In Progress": "bg-green-100 text-green-700",
    "Final Walkthrough": "bg-teal-100 text-teal-700",
    "Pending Payment": "bg-indigo-100 text-indigo-700",
    "Completed": "bg-gray-100 text-gray-600",
  };
  return m[stage ?? ""] || "bg-gray-100 text-gray-700";
}

const ACTIVE = ["Scheduled","Materials Needed","Ready to Start","In Progress","Final Walkthrough"];

export default async function ContractorDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "contractor") redirect("/contractor-login");

  const crewName = (session.user as { name?: string }).name ?? "";
  const jobs = await getJobsForCrew(crewName).catch(() => []);
  const activeJobs = jobs.filter((j) => ACTIVE.includes(j.stage ?? ""));
  const nextJob = jobs.filter((j) => j.startDate && new Date(j.startDate) > new Date())
    .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime())[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-provision-charcoal-dark">My Jobs</h1>
        <p className="text-sm text-provision-gray-text">All jobs assigned to your crew</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="text-xs text-provision-gray-text uppercase tracking-wide mb-1">Active Jobs</div>
          <div className="text-3xl font-bold text-provision-orange">{activeJobs.length}</div>
        </div>
        <div className="card">
          <div className="text-xs text-provision-gray-text uppercase tracking-wide mb-1">Next Start</div>
          <div className="text-sm font-semibold text-provision-charcoal-dark">
            {nextJob ? formatDate(nextJob.startDate) : "—"}
          </div>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="card text-center py-10">
          <Briefcase className="w-10 h-10 text-provision-gray-text mx-auto mb-3" />
          <p className="text-provision-gray-text">No jobs assigned yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job: ProductionJob) => (
            <div key={job.id} className="card hover:shadow-card-hover transition">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-provision-charcoal-dark">{job.job}</h3>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-provision-gray-text">
                    <MapPin className="w-3 h-3" />
                    {job.dealId ? "Contact Miriam for address details" : "Address TBD"}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${stageColor(job.stage)}`}>
                  {job.stage || "Unknown"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-provision-gray-text">
                <Calendar className="w-3 h-3 text-provision-orange" />
                {formatDate(job.startDate)} → {formatDate(job.endDate)}
                {job.crewConfirmed && <span className="ml-2 text-green-600 font-medium">✓ Confirmed</span>}
              </div>
              {job.notes && (
                <div className="mt-2 p-2 bg-provision-gray rounded text-xs text-provision-gray-text">
                  <span className="font-medium">Notes: </span>{job.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
