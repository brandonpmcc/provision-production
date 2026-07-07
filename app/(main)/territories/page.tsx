export const dynamic = "force-dynamic";

import { MapPin } from "lucide-react";
import { getTerritoryStats, getActivePipelineJobs } from "@/lib/airtable";
import { TERRITORIES } from "@/lib/territories";

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

export default async function TerritoriesPage() {
  const [territoryStats, allJobs] = await Promise.all([
    getTerritoryStats().catch(() => []),
    getActivePipelineJobs().catch(() => []),
  ]);

  const totalRevenue = territoryStats.reduce((sum, t) => sum + t.totalRevenue, 0);
  const totalBudgetedHours = territoryStats.reduce((sum, t) => sum + t.totalBudgetedHours, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-5 h-5 text-provision-orange" />
          <h1 className="text-3xl font-bold text-gray-900">Territory Overview</h1>
        </div>
        <p className="text-gray-500">
          {territoryStats.length} territories · {money(totalRevenue)} total revenue · {totalBudgetedHours.toFixed(0)}h total budgeted hours
        </p>
      </div>

      {/* Territory Cards Grid (2x2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {territoryStats.map((stat) => {
          const territory = stat.territory;
          const hourTarget = 100; // weekly target
          const hoursFilled = (stat.totalBudgetedHours / hourTarget) * 100;

          return (
            <div
              key={territory.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition"
            >
              {/* Territory header */}
              <div
                className="px-3 py-2 rounded-md mb-4 -mx-6 -mt-6 mx-6"
                style={{
                  backgroundColor: territory.colorLight,
                  borderLeft: `4px solid ${territory.color}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg" style={{ color: territory.color }}>
                    {territory.name}
                  </h2>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded ${overloadColor(
                      stat.overloadStatus
                    )}`}
                  >
                    {overloadLabel(stat.overloadStatus)}
                  </span>
                </div>
              </div>

              {/* PM Assignment */}
              <div className="mb-4 pb-4 border-b border-gray-100">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">PM:</span>{" "}
                  {territory.primaryPmEmail || <span className="text-gray-400">Unassigned</span>}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 font-medium">Active Jobs</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{stat.activeJobs}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 font-medium">Pending Schedule</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{stat.pendingScheduleJobs}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 font-medium">In Progress</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{stat.inProgressJobs}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 font-medium">Revenue</div>
                  <div className="text-lg font-bold text-provision-orange mt-1">
                    {money(stat.totalRevenue)}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 font-medium">Budgeted Hours</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {stat.totalBudgetedHours.toFixed(0)}h
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 font-medium">Unscheduled</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{stat.unscheduledJobs}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 font-medium">This Week</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{stat.jobsThisWeek}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 font-medium">Next Week</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{stat.jobsNextWeek}</div>
                </div>
              </div>

              {/* Hours Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600 font-medium">Weekly Hours Target (100h)</span>
                  <span className="text-xs text-gray-500">
                    {Math.min(hoursFilled, 100).toFixed(0)}%
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

              {/* ZIP Codes */}
              <div className="text-sm">
                <button className="text-xs text-gray-500 hover:text-gray-700 font-medium">
                  {territory.zipCodes.length} ZIP codes served
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Territory Revenue Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Revenue by Territory</h2>
        <div className="space-y-4">
          {territoryStats.map((stat) => {
            const percentage = (stat.totalRevenue / totalRevenue) * 100;

            return (
              <div key={stat.territory.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: stat.territory.color }}
                    />
                    <span className="text-sm font-medium text-gray-900">{stat.territory.name}</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">{percentage.toFixed(1)}%</div>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full transition"
                    style={{
                      backgroundColor: stat.territory.color,
                      width: `${percentage}%`,
                    }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">{money(stat.totalRevenue)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Jobs by Territory Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Jobs Summary</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Territory</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-700">Active</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-700">Pending</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-700">In Progress</th>
              <th className="px-6 py-3 text-right font-semibold text-gray-700">Revenue</th>
              <th className="px-6 py-3 text-right font-semibold text-gray-700">Hours</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {territoryStats.map((stat) => (
              <tr key={stat.territory.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{stat.territory.name}</td>
                <td className="px-6 py-4 text-center text-gray-600">{stat.activeJobs}</td>
                <td className="px-6 py-4 text-center text-gray-600">{stat.pendingScheduleJobs}</td>
                <td className="px-6 py-4 text-center text-gray-600">{stat.inProgressJobs}</td>
                <td className="px-6 py-4 text-right font-semibold text-provision-orange">
                  {money(stat.totalRevenue)}
                </td>
                <td className="px-6 py-4 text-right text-gray-600">{stat.totalBudgetedHours.toFixed(0)}h</td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded ${overloadColor(
                      stat.overloadStatus
                    )}`}
                  >
                    {overloadLabel(stat.overloadStatus)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
