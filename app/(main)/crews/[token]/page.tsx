export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { TOKEN_TO_LOGIN } from "@/lib/contractor-auth";
import { getActivePipelineJobs } from "@/lib/airtable";
import {
  HardHat, MapPin, Calendar, Clock, DollarSign,
  ExternalLink, ArrowLeft, CheckCircle2, AlertCircle,
} from "lucide-react";

function money(n: number | null | undefined) {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

function fmtDate(d: string | null) {
  if (!d) return "TBD";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const STAGE_COLOR: Record<string, string> = {
  "In Progress":        "bg-green-100 text-green-700 border-green-200",
  "Scheduled":          "bg-provision-teal-light text-provision-teal border-provision-teal/20",
  "Needs Confirmation": "bg-blue-100 text-blue-700 border-blue-200",
  "Materials Needed":   "bg-purple-100 text-purple-700 border-purple-200",
  "Ready to Start":     "bg-orange-100 text-orange-700 border-orange-200",
  "Final Walkthrough":  "bg-teal-100 text-teal-700 border-teal-200",
  "Pending Schedule":   "bg-gray-100 text-gray-600 border-gray-200",
  "Completed":          "bg-gray-100 text-gray-400 border-gray-200",
};

const ACTIVE_STAGES = new Set([
  "Needs Confirmation", "Scheduled", "Materials Needed",
  "Ready to Start", "In Progress", "Final Walkthrough",
]);

export default async function SubProfilePage({
  params,
}: {
  params: { token: string };
}) {
  const login = TOKEN_TO_LOGIN[params.token];
  if (!login) notFound();

  const allJobs = await getActivePipelineJobs().catch(() => []);
  const crewJobs = allJobs.filter(j => j.crew === login.crewName);
  const activeJobs = crewJobs.filter(j => ACTIVE_STAGES.has(j.productionStage));
  const completedJobs = crewJobs.filter(j => !ACTIVE_STAGES.has(j.productionStage));

  const totalRevenue = crewJobs.reduce((s, j) => s + (j.value ?? 0), 0);
  const totalHours   = crewJobs.reduce((s, j) => s + (j.estimatedHours ?? 0), 0);
  const confirmedJobs = activeJobs.filter(j => j.crewConfirmed).length;

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link href="/crews" className="flex items-center gap-1.5 text-xs font-bold text-provision-gray-text hover:text-provision-navy uppercase tracking-wide transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Crew Registry
      </Link>

      {/* Profile header */}
      <div className="card flex items-start gap-5">
        <div className="w-16 h-16 rounded-2xl bg-provision-navy flex items-center justify-center flex-shrink-0">
          <HardHat className="w-8 h-8 text-provision-orange" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="section-label mb-0.5">Subcontractor Profile</div>
          <h1 className="font-display font-black text-2xl text-provision-navy uppercase tracking-tight leading-tight">
            {login.crewName}
          </h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wide">
              Active
            </span>
            <span className="text-xs text-provision-gray-text font-mono">{login.email}</span>
            <span className="text-xs text-provision-gray-text font-mono">PIN: {login.pin}</span>
          </div>
        </div>
        <a
          href={`/crew/${login.token}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-teal flex-shrink-0 text-xs"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open Portal
        </a>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Active Jobs",    val: activeJobs.length,   color: "border-provision-orange" },
          { label: "Confirmed",      val: `${confirmedJobs}/${activeJobs.length}`, color: "border-provision-teal" },
          { label: "Total Revenue",  val: money(totalRevenue), color: "border-green-400" },
          { label: "Budgeted Hrs",   val: `${totalHours}h`,   color: "border-gray-300" },
        ].map(({ label, val, color }) => (
          <div key={label} className={`card border-t-4 ${color}`}>
            <div className="text-[10px] font-bold text-provision-gray-muted uppercase tracking-wide mb-1">{label}</div>
            <div className="font-display font-black text-xl text-provision-navy">{val}</div>
          </div>
        ))}
      </div>

      {/* Active jobs */}
      <div className="space-y-2">
        <h2 className="font-display font-black text-provision-navy uppercase tracking-wide text-sm flex items-center gap-2">
          Active Jobs ({activeJobs.length})
        </h2>
        {activeJobs.length === 0 ? (
          <div className="card text-center py-8 text-provision-gray-text text-sm">No active jobs assigned</div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-provision-navy">
                  {["Customer", "Address", "Stage", "Start → End", "Hours", "Revenue", "Confirmed"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-white/60 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-provision-gray-mid">
                {activeJobs.map(job => (
                  <tr key={job.id} className="hover:bg-provision-gray transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-display font-black text-provision-navy text-[12px] uppercase tracking-tight">{job.name}</div>
                      {job.pmName && <div className="text-[10px] text-provision-gray-muted mt-0.5">PM: {job.pmName}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-provision-gray-text">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {job.address || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`pill border text-[10px] ${STAGE_COLOR[job.productionStage] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                        {job.productionStage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-provision-gray-text">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {fmtDate(job.startDate)} → {fmtDate(job.endDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-xs text-provision-gray-text">
                        <Clock className="w-3 h-3" />
                        {job.estimatedHours ? `${job.estimatedHours}h` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-provision-navy">
                      {money(job.value)}
                    </td>
                    <td className="px-4 py-3">
                      {job.crewConfirmed
                        ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                        : <AlertCircle className="w-4 h-4 text-yellow-500" />
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Completed job history */}
      {completedJobs.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-display font-black text-provision-navy uppercase tracking-wide text-sm text-provision-gray-muted">
            Job History ({completedJobs.length})
          </h2>
          <div className="card p-0 overflow-hidden opacity-75">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-provision-gray-mid">
                {completedJobs.map(job => (
                  <tr key={job.id} className="hover:bg-provision-gray transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-provision-gray-text">{job.name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`pill border text-[10px] ${STAGE_COLOR[job.productionStage] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                        {job.productionStage}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-provision-gray-text">{money(job.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Portal link share */}
      <div className="card bg-provision-navy border-provision-navy text-white flex items-center gap-4">
        <div className="flex-1">
          <div className="font-display font-black text-white uppercase tracking-wide text-sm mb-1">
            Crew Portal Link
          </div>
          <div className="text-white/50 text-xs font-mono">
            /crew/{login.token}
          </div>
          <div className="text-white/40 text-xs mt-1">
            Share this link with {login.crewName} — they can see their jobs, accept, and mark complete. No login needed.
          </div>
        </div>
        <a
          href={`/crew/${login.token}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary flex-shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
          Open Portal
        </a>
      </div>
    </div>
  );
}
