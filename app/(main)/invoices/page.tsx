export const dynamic = "force-dynamic";

import { getCompletedJobsNeedingReview } from "@/lib/airtable";
import { AlertTriangle, CheckCircle2, DollarSign, FileWarning, Clock } from "lucide-react";

function money(n: number | null | undefined) {
  if (!n) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

const STAGE_BADGE: Record<string, string> = {
  "Project Complete":    "bg-green-100 text-green-700",
  "RES Pending Payment": "bg-orange-100 text-orange-700",
  "Touch Up Needed":     "bg-yellow-100 text-yellow-700",
};

export default async function InvoiceReviewPage() {
  const jobs = await getCompletedJobsNeedingReview().catch(() => []);

  const flagged   = jobs.filter(j => j.needsReview);
  const clean     = jobs.filter(j => !j.needsReview);
  const totalOpen = flagged.reduce((s, j) => s + (j.openBalance ?? 0), 0);
  const totalValue = flagged.reduce((s, j) => s + (j.value ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="section-label mb-0.5">Finance</div>
        <h1 className="page-header">Invoice Review</h1>
        <p className="text-sm text-provision-gray-text mt-0.5">
          Completed jobs cross-checked against invoice status
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Needs Review",   val: flagged.length,      color: "text-provision-orange border-provision-orange", icon: <AlertTriangle className="w-4 h-4 text-provision-orange" /> },
          { label: "Open Balance",   val: money(totalOpen),    color: "text-red-600 border-red-400",                   icon: <DollarSign className="w-4 h-4 text-red-500" /> },
          { label: "At-Risk Value",  val: money(totalValue),   color: "text-yellow-600 border-yellow-400",             icon: <FileWarning className="w-4 h-4 text-yellow-500" /> },
          { label: "Collected ✓",    val: clean.length,        color: "text-green-600 border-green-400",               icon: <CheckCircle2 className="w-4 h-4 text-green-500" /> },
        ].map(({ label, val, color, icon }) => (
          <div key={label} className={`card border-t-4 ${color.split(" ")[1]}`}>
            <div className="flex items-center gap-2 mb-1">
              {icon}
              <span className="text-[11px] font-bold text-provision-gray-muted uppercase tracking-wide">{label}</span>
            </div>
            <div className={`font-display font-black text-2xl leading-tight ${color.split(" ")[0]}`}>{val}</div>
          </div>
        ))}
      </div>

      {/* Flagged jobs */}
      {flagged.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-provision-orange" />
            <h2 className="font-display font-black text-provision-navy uppercase tracking-wide text-sm">
              Needs Attention ({flagged.length})
            </h2>
          </div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-provision-navy">
                  {["Customer", "Stage", "Job Value", "Invoiced", "Open Balance", "Issue"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-white/60 uppercase tracking-widest">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-provision-gray-mid">
                {flagged.map(job => (
                  <tr key={job.id} className="hover:bg-red-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-display font-black text-provision-navy text-[13px] uppercase tracking-tight">
                        {job.name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`pill border ${STAGE_BADGE[job.stage] ?? "bg-gray-100 text-gray-600"}`}>
                        {job.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-provision-navy">{money(job.value)}</td>
                    <td className="px-4 py-3 text-provision-gray-text">{money(job.invoicedTotal)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${(job.openBalance ?? 0) > 0 ? "text-red-600" : "text-provision-gray-muted"}`}>
                        {money(job.openBalance)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-provision-orange">
                        <AlertTriangle className="w-3 h-3" />
                        {job.reviewReason}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clean jobs */}
      {clean.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <h2 className="font-display font-black text-provision-navy uppercase tracking-wide text-sm">
              Collected &amp; Closed ({clean.length})
            </h2>
          </div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-provision-gray border-b border-provision-gray-mid">
                  {["Customer", "Stage", "Value", "Invoiced", "Status"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-provision-gray-muted uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-provision-gray-mid">
                {clean.map(job => (
                  <tr key={job.id} className="hover:bg-provision-gray transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-provision-navy">{job.name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`pill border ${STAGE_BADGE[job.stage] ?? "bg-gray-100 text-gray-600"}`}>
                        {job.stage}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-provision-gray-text">{money(job.value)}</td>
                    <td className="px-4 py-2.5 text-provision-gray-text">{money(job.invoicedTotal)}</td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                        <CheckCircle2 className="w-3 h-3" /> Collected
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {jobs.length === 0 && (
        <div className="card text-center py-12">
          <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <div className="font-display font-black text-provision-navy uppercase">No completed jobs found</div>
          <p className="text-provision-gray-text text-sm mt-1">Jobs will appear here when deals move to Project Complete or Pending Payment.</p>
        </div>
      )}
    </div>
  );
}
