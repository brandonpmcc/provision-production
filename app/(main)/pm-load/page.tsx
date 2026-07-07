export const dynamic = "force-dynamic";

import Link from "next/link";
import { Users } from "lucide-react";
import { getPmStats, getActivePipelineJobs } from "@/lib/airtable";

function money(n: number | null | undefined) {
  if (n == null) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

function overloadColor(status: "healthy" | "busy" | "overloaded") {
  switch (status) {
    case "healthy":
      return "bg-green-100 text-green-800";
    case "busy":
      return "bg-yellow-100 text-yellow-800";
    case "overloaded":
      return "bg-red-100 text-red-800";
  }
}

function overloadLabel(status: "healthy" | "busy" | "overloaded") {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "busy":
      return "Busy";
    case "overloaded":
      return "Overloaded";
  }
}

export default async function PMLoadPage() {
  const [pmStats, allJobs] = await Promise.all([
    getPmStats().catch(() => []),
    getActivePipelineJobs().catch(() => []),
  ]);

  const totalActiveJobs = pmStats.reduce((sum, pm) => sum + pm.activeJobs, 0);
  const totalRevenue = pmStats.reduce((sum, pm) => sum + pm.totalRevenue, 0);
  const totalHours = pmStats.reduce((sum, pm) => sum + pm.totalBudgetedHours, 0);

  // Find highest/lowest for fairness check
  const revenueValues = pmStats.map((pm) => pm.totalRevenue);
  const hoursValues = pmStats.map((pm) => pm.totalBudgetedHours);
  const maxRevenue = Math.max(...revenueValues, 0);
  const minRevenue = Math.min(...revenueValues, 0);
  const maxHours = Math.max(...hoursValues, 0);
  const minHours = Math.min(...hoursValues, 0);

  const revenueDiff = maxRevenue - minRevenue;
  const hoursDiff = maxHours - minHours;
  const isUnfair =
    (maxRevenue > 0 && maxRevenue > minRevenue * 2) || (maxHours > 0 && maxHours > minHours * 2);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-provision-orange" />
          <h1 className="text-3xl font-bold text-gray-900">PM Workload</h1>
        </div>
        <p className="text-gray-500">
          {pmStats.length} Project Managers · {totalActiveJobs} total active jobs
        </p>
      </div>

      {/* PM Workload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pmStats.map((pm) => {
          const hourCap = 55;
          const hoursFilled = (pm.totalBudgetedHours / hourCap) * 100;

          return (
            <div key={pm.pmRecordId} className="bg-white rounded-lg border border-gray-200 p-6">
              {/* PM Name and Role */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">{pm.pmName}</h2>
                <p className="text-xs text-gray-500 mt-1">Project Manager</p>
                <span
                  className={`inline-block text-xs font-semibold px-2 py-1 rounded mt-2 ${overloadColor(
                    pm.overloadStatus
                  )}`}
                >
                  {overloadLabel(pm.overloadStatus)}
                </span>
              </div>

              {/* Main Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 font-medium">Active Jobs</div>
                  <div className="text-xl font-bold text-gray-900 mt-1">{pm.activeJobs}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 font-medium">Pending</div>
                  <div className="text-xl font-bold text-gray-900 mt-1">{pm.pendingScheduleJobs}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 font-medium">In Progress</div>
                  <div className="text-xl font-bold text-gray-900 mt-1">{pm.inProgressJobs}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 font-medium">Revenue</div>
                  <div className="text-lg font-bold text-provision-orange mt-1">
                    {money(pm.totalRevenue)}
                  </div>
                </div>
              </div>

              {/* Hours Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600 font-medium">Weekly Hours ({hourCap}h cap)</span>
                  <span className="text-xs font-semibold text-gray-700">
                    {pm.totalBudgetedHours.toFixed(0)}h
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition ${
                      hoursFilled <= 100
                        ? "bg-green-500"
                        : hoursFilled <= 150
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(hoursFilled, 100)}%` }}
                  />
                </div>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-gray-100">
                <div className="text-xs">
                  <div className="text-gray-500 font-medium">This Week</div>
                  <div className="text-sm font-semibold text-gray-900 mt-1">{pm.jobsThisWeek}</div>
                </div>
                <div className="text-xs">
                  <div className="text-gray-500 font-medium">Next Week</div>
                  <div className="text-sm font-semibold text-gray-900 mt-1">{pm.jobsNextWeek}</div>
                </div>
              </div>

              {/* Attention Items */}
              <div className="space-y-2 mb-4">
                <div className="text-xs font-semibold text-gray-700">Attention Items</div>
                <div className="space-y-1 text-xs">
                  {pm.missingColorJobs > 0 && (
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Missing Colors</span>
                      <span className="font-semibold text-red-600">{pm.missingColorJobs}</span>
                    </div>
                  )}
                  {pm.missingMaterialJobs > 0 && (
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Missing Materials</span>
                      <span className="font-semibold text-red-600">{pm.missingMaterialJobs}</span>
                    </div>
                  )}
                  {pm.missingCrewJobs > 0 && (
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Missing Crew</span>
                      <span className="font-semibold text-red-600">{pm.missingCrewJobs}</span>
                    </div>
                  )}
                  {pm.unscheduledJobs > 0 && (
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Unscheduled Jobs</span>
                      <span className="font-semibold text-orange-600">{pm.unscheduledJobs}</span>
                    </div>
                  )}
                  {pm.jobsOutsidePrimaryTerritory > 0 && (
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Outside Territory</span>
                      <span className="font-semibold text-yellow-600">{pm.jobsOutsidePrimaryTerritory}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* View Jobs Link */}
              <Link
                href="/pipeline"
                className="block text-center text-sm font-semibold text-provision-orange hover:text-provision-orange-dark bg-orange-50 rounded-lg py-2 transition"
              >
                View {pm.activeJobs} Jobs →
              </Link>
            </div>
          );
        })}
      </div>

      {/* Workload Comparison */}
      {pmStats.length > 1 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Workload Distribution</h2>

          {/* Revenue Balance */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue Balance</h3>
            <div className="space-y-3">
              {pmStats.map((pm) => {
                const percentage = (pm.totalRevenue / totalRevenue) * 100;
                return (
                  <div key={pm.pmRecordId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{pm.pmName}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {money(pm.totalRevenue)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-provision-orange rounded-full transition"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hours Balance */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Hours Balance</h3>
            <div className="space-y-3">
              {pmStats.map((pm) => {
                const percentage = totalHours > 0 ? (pm.totalBudgetedHours / totalHours) * 100 : 0;
                return (
                  <div key={pm.pmRecordId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{pm.pmName}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {pm.totalBudgetedHours.toFixed(0)}h ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PM Fairness Section */}
      {pmStats.length > 1 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Fairness Analysis</h2>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Revenue Difference</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Between highest and lowest PM
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{money(revenueDiff)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {maxRevenue > 0 ? ((revenueDiff / minRevenue) * 100).toFixed(0) : "—"}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Hours Difference</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Between highest and lowest PM
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{hoursDiff.toFixed(0)}h</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {maxHours > 0 ? ((hoursDiff / minHours) * 100).toFixed(0) : "—"}%
                  </p>
                </div>
              </div>
            </div>

            {isUnfair && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-red-800">Alert: Workload Imbalance</p>
                <p className="text-xs text-red-700 mt-1">
                  One PM has more than 2x the workload of another. Consider rebalancing.
                </p>
              </div>
            )}

            {!isUnfair && pmStats.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-green-800">Workload Balanced</p>
                <p className="text-xs text-green-700 mt-1">
                  PM workload is fairly distributed.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
