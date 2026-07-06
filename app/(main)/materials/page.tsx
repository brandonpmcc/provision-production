export const dynamic = "force-dynamic";
import { getProductionJobs, getDJActiveJobs } from "@/lib/airtable";
import type { ProductionStage } from "@/lib/types";
import { AlertTriangle, Package, Clock } from "lucide-react";

const ACTIVE_STAGES: ProductionStage[] = [
  "Scheduled", "Materials Needed", "Ready to Start", "In Progress", "Needs Confirmation",
];

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
  return diff;
}

function money(n: number | null | undefined) {
  if (!n) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default async function MaterialsPage() {
  const [prodJobs, djJobs] = await Promise.all([
    getProductionJobs().catch(() => []),
    getDJActiveJobs().catch(() => []),
  ]);

  // Build DJ Job lookup by dealId for enrichment
  const djByDealId = new Map(djJobs.filter((dj) => dj.dealId).map((dj) => [dj.dealId!, dj]));

  // Active jobs from Production table
  const activeJobs = prodJobs.filter((j) => ACTIVE_STAGES.includes(j.stage as ProductionStage));

  // ── Urgent: starting in ≤7 days with materials NOT received ──
  const urgent = activeJobs
    .filter((j) => {
      const d = daysUntil(j.startDate);
      return d != null && d <= 7 && d >= -1 && j.materialStatus !== "Received";
    })
    .sort((a, b) => (daysUntil(a.startDate) ?? 99) - (daysUntil(b.startDate) ?? 99));

  // ── Special material warnings ──
  const warnings = activeJobs.filter((j) => j.specialMaterialsWarning);

  // ── Status buckets ──
  const buckets = {
    "Not Ordered": activeJobs.filter((j) => !j.materialStatus || j.materialStatus === "Not Ordered"),
    "Ordered":     activeJobs.filter((j) => j.materialStatus === "Ordered"),
    "Received":    activeJobs.filter((j) => j.materialStatus === "Received"),
    "Backordered": activeJobs.filter((j) => j.materialStatus === "Backordered"),
  };

  const bucketStyle = {
    "Not Ordered": { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", dot: "bg-gray-400" },
    "Ordered":     { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-800", dot: "bg-yellow-400" },
    "Received":    { bg: "bg-green-50", border: "border-green-200", text: "text-green-800", dot: "bg-green-500" },
    "Backordered": { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", dot: "bg-red-500" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-provision-charcoal-dark">Materials</h1>
        <p className="text-sm text-provision-gray-text">
          {activeJobs.length} active jobs tracked · {warnings.length} special material warnings
        </p>
      </div>

      {/* ── Urgent: needs action this week ── */}
      {urgent.length > 0 && (
        <section className="card border-l-4 border-red-400">
          <h2 className="font-semibold text-provision-charcoal-dark mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-red-500" />
            Starting soon — materials needed ({urgent.length})
          </h2>
          <div className="space-y-2">
            {urgent.map((j) => {
              const days = daysUntil(j.startDate);
              const dj = j.dealId ? djByDealId.get(j.dealId) : null;
              return (
                <div key={j.id} className="flex items-center justify-between text-sm py-2 border-b border-provision-gray-mid last:border-0 gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-provision-charcoal-dark truncate">{j.job}</div>
                    <div className="text-xs text-provision-gray-text mt-0.5">
                      {j.crew || "no crew"} · {dj ? money(dj.revenue) : ""}
                      {j.specialMaterialsWarning && (
                        <span className="ml-2 text-orange-600">⚠ {j.specialMaterialsWarning}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      j.materialStatus === "Backordered" ? "bg-red-100 text-red-700" :
                      j.materialStatus === "Ordered" ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {j.materialStatus || "Not Ordered"}
                    </span>
                    <span className={`font-semibold text-sm ${days === 0 ? "text-red-600" : days != null && days <= 3 ? "text-orange-600" : "text-provision-charcoal-dark"}`}>
                      {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Special warnings ── */}
      {warnings.length > 0 && (
        <section className="card border-l-4 border-orange-400">
          <h2 className="font-semibold text-provision-charcoal-dark mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Special material warnings ({warnings.length})
          </h2>
          <div className="space-y-1.5">
            {warnings.map((j) => (
              <div key={j.id} className="text-sm border-b border-provision-gray-mid last:border-0 py-1.5">
                <div className="font-medium text-provision-charcoal-dark">{j.job}</div>
                <div className="text-xs text-orange-700 mt-0.5">{j.specialMaterialsWarning}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Status board ── */}
      <div>
        <h2 className="font-semibold text-provision-charcoal-dark mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-provision-gray-text" />
          Materials status board
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {(Object.entries(buckets) as [keyof typeof buckets, typeof activeJobs][]).map(([label, items]) => {
            const s = bucketStyle[label];
            return (
              <div key={label} className={`rounded-xl border ${s.border} ${s.bg} p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span className={`text-xs font-semibold uppercase tracking-wide ${s.text}`}>{label}</span>
                </div>
                <div className={`text-3xl font-bold mb-3 ${s.text}`}>{items.length}</div>
                <div className="space-y-1">
                  {items.slice(0, 4).map((j) => (
                    <div key={j.id} className={`text-[10px] truncate ${s.text} opacity-80`}>
                      {j.job}
                    </div>
                  ))}
                  {items.length > 4 && (
                    <div className={`text-[10px] ${s.text} opacity-60`}>+{items.length - 4} more</div>
                  )}
                  {items.length === 0 && (
                    <div className={`text-[10px] italic ${s.text} opacity-50`}>none</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activeJobs.length === 0 && (
        <div className="card text-sm text-provision-gray-text text-center py-8">
          No activated jobs yet. Activate jobs from the Pipeline to start tracking materials.
        </div>
      )}
    </div>
  );
}
