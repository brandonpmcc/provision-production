export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions, roleFor } from "@/lib/auth";
import {
  getProductionDeals,
  getProductionJobs,
  getCrews,
  getMonthlyGoal,
  getMonthlyGoals,
} from "@/lib/airtable";
import type { ProductionJob } from "@/lib/types";
import {
  Briefcase,
  DollarSign,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wrench,
  BarChart2,
} from "lucide-react";

function money(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

// ─── Attention-flag helpers ────────────────────────────────────────────────

const ACTIVE_STAGES = new Set([
  "Needs Confirmation",
  "Scheduled",
  "Materials Needed",
  "Ready to Start",
  "In Progress",
  "Final Walkthrough",
]);

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

interface AttentionItem {
  id: string;
  name: string;
  stage: string;
  reason: string;
  urgency: "high" | "medium" | "low";
}

function buildAttentionList(jobs: ProductionJob[]): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const j of jobs) {
    if (!j.stage || !ACTIVE_STAGES.has(j.stage)) continue;
    const days = daysUntil(j.startDate);
    const startLabel = days != null
      ? days <= 0 ? "TODAY" : days === 1 ? "tomorrow" : `in ${days}d`
      : null;

    // Backordered materials — always high urgency
    if (j.materialStatus === "Backordered") {
      items.push({
        id: j.id,
        name: j.job,
        stage: j.stage,
        reason: "Materials backordered",
        urgency: "high",
      });
    }

    // No crew assigned and job is scheduled or later
    if (
      !j.crew &&
      ["Scheduled", "Materials Needed", "Ready to Start", "In Progress"].includes(j.stage ?? "")
    ) {
      items.push({
        id: j.id,
        name: j.job,
        stage: j.stage,
        reason: "No crew assigned",
        urgency: "high",
      });
    }

    // Customer hasn't confirmed — and start is approaching
    if (
      !j.customerConfirmedStart &&
      days != null &&
      days <= 14 &&
      ["Scheduled", "Ready to Start", "In Progress"].includes(j.stage ?? "")
    ) {
      items.push({
        id: j.id,
        name: j.job,
        stage: j.stage,
        reason: `Customer unconfirmed${startLabel ? ` · starts ${startLabel}` : ""}`,
        urgency: days <= 3 ? "high" : "medium",
      });
    }

    // Crew not confirmed — start approaching
    if (
      j.crew &&
      !j.crewConfirmed &&
      days != null &&
      days <= 7 &&
      ["Scheduled", "Ready to Start"].includes(j.stage ?? "")
    ) {
      items.push({
        id: j.id,
        name: j.job,
        stage: j.stage,
        reason: `Crew unconfirmed${startLabel ? ` · starts ${startLabel}` : ""}`,
        urgency: days <= 3 ? "high" : "medium",
      });
    }

    // Sitting in Needs Confirmation stage
    if (j.stage === "Needs Confirmation") {
      items.push({
        id: j.id,
        name: j.job,
        stage: j.stage,
        reason: "Awaiting confirmation",
        urgency: "low",
      });
    }
  }

  // Deduplicate by job id + reason, sort by urgency
  const seen = new Set<string>();
  const urgencyOrder = { high: 0, medium: 1, low: 2 };
  return items
    .filter((item) => {
      const key = `${item.id}:${item.reason}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const role = roleFor(session?.user?.email);
  const isManager = role === "manager";

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [deals, jobs, crews, monthGoal, yearGoals] = await Promise.all([
    getProductionDeals().catch(() => []),
    getProductionJobs().catch(() => []),
    getCrews().catch(() => []),
    getMonthlyGoal(year, month).catch(() => null),
    getMonthlyGoals(year).catch(() => []),
  ]);

  const totalPipelineValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
  const inProgressDeals = deals.filter((d) => d.stage === "Project In Progress").length;
  const pendingScheduleDeals = deals.filter((d) => d.stage === "Project Pending Schedule").length;

  const weeklyTarget = monthGoal?.productionGoal
    ? Math.round(monthGoal.productionGoal / 4.33)
    : null;

  // Manager-only computations
  const attentionItems = isManager ? buildAttentionList(jobs) : [];
  const highCount  = attentionItems.filter((i) => i.urgency === "high").length;
  const goalPct    = monthGoal?.productionGoal && monthGoal?.actualProduction
    ? Math.min(100, Math.round((monthGoal.actualProduction / monthGoal.productionGoal) * 100))
    : null;

  return (
    <div className="space-y-6">
      {/* Page header — website-style bold display heading */}
      <div className="flex items-center justify-between">
        <div>
          <div className="section-label mb-0.5">Pro-Vision Painting</div>
          <h1 className="page-header">Production Dashboard</h1>
          <p className="text-sm text-provision-gray-text mt-0.5">
            {now.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* ── Manager metrics strip ─────────────────────────────────────── */}
      {isManager && (
        <section className="rounded-xl border border-provision-orange/30 bg-gradient-to-r from-provision-orange-light to-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-provision-orange" />
            <h2 className="font-display font-black text-sm text-provision-navy uppercase tracking-wide">
              Manager View
            </h2>
            {highCount > 0 && (
              <span className="ml-auto flex items-center gap-1 text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                {highCount} urgent
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Revenue vs Goal */}
            <div>
              <div className="text-xs font-semibold text-provision-gray-text uppercase tracking-wide mb-2">
                Revenue vs {now.toLocaleDateString("en-US", { month: "long" })} Goal
              </div>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-2xl font-bold text-provision-charcoal-dark">
                  {money(monthGoal?.actualProduction)}
                </span>
                <span className="text-sm text-provision-gray-text mb-0.5">
                  / {money(monthGoal?.productionGoal)} goal
                </span>
              </div>
              {goalPct != null ? (
                <>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full transition-all ${
                        goalPct >= 80
                          ? "bg-green-500"
                          : goalPct >= 50
                          ? "bg-provision-orange"
                          : "bg-red-400"
                      }`}
                      style={{ width: `${goalPct}%` }}
                    />
                  </div>
                  <div className="text-xs text-provision-gray-text">
                    {goalPct}% of goal ·{" "}
                    {monthGoal?.productionGoal && monthGoal?.actualProduction
                      ? money(monthGoal.productionGoal - monthGoal.actualProduction) + " remaining"
                      : ""}
                    {weeklyTarget
                      ? ` · ~${money(weeklyTarget)}/wk target`
                      : ""}
                  </div>
                </>
              ) : (
                <div className="text-xs text-provision-gray-text italic">
                  Actual not yet recorded in GBC Monthly Performance table.
                  {weeklyTarget && (
                    <span className="block mt-0.5 not-italic">
                      Weekly target: ~{money(weeklyTarget)}
                    </span>
                  )}
                </div>
              )}
              {/* Labor + material budgets */}
              {(monthGoal?.laborBudget || monthGoal?.materialBudget) && (
                <div className="flex gap-4 mt-2 pt-2 border-t border-provision-orange/20 text-xs text-provision-gray-text">
                  {monthGoal?.laborBudget && (
                    <span>Labor budget: {money(monthGoal.laborBudget)}</span>
                  )}
                  {monthGoal?.materialBudget && (
                    <span>Materials budget: {money(monthGoal.materialBudget)}</span>
                  )}
                </div>
              )}
            </div>

            {/* Jobs needing attention */}
            <div>
              <div className="text-xs font-semibold text-provision-gray-text uppercase tracking-wide mb-2">
                Needs Attention ({attentionItems.length})
              </div>
              {attentionItems.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  All jobs are on track
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {attentionItems.map((item) => (
                    <div
                      key={`${item.id}-${item.reason}`}
                      className="flex items-start gap-2 text-xs"
                    >
                      <AttentionIcon urgency={item.urgency} />
                      <div className="min-w-0">
                        <span className="font-medium text-provision-charcoal-dark truncate block">
                          {item.name}
                        </span>
                        <span className={`${
                          item.urgency === "high"
                            ? "text-red-600"
                            : item.urgency === "medium"
                            ? "text-yellow-700"
                            : "text-provision-gray-text"
                        }`}>
                          {item.reason}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {attentionItems.length > 0 && (
                <a
                  href="/pipeline"
                  className="mt-2 inline-block text-[11px] text-provision-orange-dark hover:underline"
                >
                  View all in Pipeline →
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── KPI cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        <Kpi
          icon={Briefcase}
          label="Pipeline value"
          value={money(totalPipelineValue)}
          sublabel={`${deals.length} active deals`}
          accent="orange"
        />
        <Kpi
          icon={TrendingUp}
          label="Monthly goal"
          value={money(monthGoal?.productionGoal)}
          sublabel={weeklyTarget ? `~${money(weeklyTarget)} / week` : "no goal set"}
          accent="teal"
        />
        <Kpi
          icon={DollarSign}
          label="In progress"
          value={`${inProgressDeals}`}
          sublabel={`${pendingScheduleDeals} awaiting schedule`}
          accent="orange"
        />
        <Kpi
          icon={Users}
          label="Active crews"
          value={`${crews.length}`}
          sublabel={`${crews.filter((c) => c.inHouse).length} in-house`}
          accent="teal"
        />
      </div>

      {/* ── Forecast strip ────────────────────────────────────────────── */}
      <section className="card teal-top border-t-4 border-provision-teal">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-black text-sm text-provision-navy uppercase tracking-wide">
            {year} Production Forecast
          </h2>
          <span className="text-xs text-provision-gray-text">
            GBC Monthly Performance
          </span>
        </div>
        <div className="grid grid-cols-12 gap-2">
          {yearGoals.length === 0 ? (
            <div className="col-span-12 text-sm text-provision-gray-text">
              No monthly goals found.
            </div>
          ) : (
            yearGoals.map((g) => {
              const isCurrent = g.monthNumber === month;
              return (
                <div
                  key={g.id}
                  className={`p-2 rounded-md border ${
                    isCurrent
                      ? "border-provision-orange bg-provision-orange-light"
                      : "border-provision-gray-mid bg-white"
                  }`}
                >
                  <div className="text-xs text-provision-gray-text">
                    {g.month?.slice(0, 3)}
                  </div>
                  <div className="font-semibold text-sm mt-1">
                    {money(g.productionGoal)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ── Quick lists ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <section className="card teal-top border-t-4 border-provision-orange">
          <h2 className="font-display font-black text-sm text-provision-navy uppercase tracking-wide mb-3">
            Pending Schedule <span className="text-provision-orange">({pendingScheduleDeals})</span>
          </h2>
          <div className="space-y-2">
            {deals
              .filter((d) => d.stage === "Project Pending Schedule")
              .slice(0, 8)
              .map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between text-sm py-1 border-b border-provision-gray-mid last:border-0"
                >
                  <div className="truncate">{d.name}</div>
                  <div className="text-provision-gray-text">{money(d.value)}</div>
                </div>
              ))}
            {pendingScheduleDeals === 0 && (
              <div className="text-sm text-provision-gray-text">Nothing pending.</div>
            )}
          </div>
        </section>

        <section className="card teal-top border-t-4 border-provision-teal">
          <h2 className="font-display font-black text-sm text-provision-navy uppercase tracking-wide mb-3">
            In Progress <span className="text-provision-teal">({inProgressDeals})</span>
          </h2>
          <div className="space-y-2">
            {deals
              .filter((d) => d.stage === "Project In Progress")
              .slice(0, 8)
              .map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between text-sm py-1 border-b border-provision-gray-mid last:border-0"
                >
                  <div className="truncate">{d.name}</div>
                  <div className="text-provision-gray-text">{money(d.value)}</div>
                </div>
              ))}
            {inProgressDeals === 0 && (
              <div className="text-sm text-provision-gray-text">Nothing in progress.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function AttentionIcon({ urgency }: { urgency: "high" | "medium" | "low" }) {
  if (urgency === "high")
    return <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />;
  if (urgency === "medium")
    return <Clock className="w-3.5 h-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />;
  return <Wrench className="w-3.5 h-3.5 text-provision-gray-text mt-0.5 flex-shrink-0" />;
}

function Kpi({
  icon: Icon,
  label,
  value,
  sublabel,
  accent = "orange",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sublabel: string;
  accent?: "orange" | "teal";
}) {
  const isOrange = accent === "orange";
  return (
    <div className={`card teal-top border-t-4 ${isOrange ? "border-provision-orange" : "border-provision-teal"}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="section-label mb-1" style={{ color: isOrange ? "#D14124" : "#05C3DE" }}>
            {label}
          </div>
          <div className="font-display font-black text-2xl text-provision-navy mt-0.5 leading-none">
            {value}
          </div>
          <div className="text-xs text-provision-gray-text mt-1.5">{sublabel}</div>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ml-3 ${
          isOrange ? "bg-provision-orange-light text-provision-orange" : "bg-provision-teal-light text-provision-teal"
        }`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
