"use client";

import { useMemo, useState } from "react";
import type { PipelineJob, SchedulingReadiness } from "@/lib/types";
import type { Territory, TerritoryId } from "@/lib/territories";
import {
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  MapPin,
  DollarSign,
  Clock,
  Package,
} from "lucide-react";

interface EnrichedJob {
  job: PipelineJob;
  territory: Territory;
  readiness: SchedulingReadiness;
  missingItems: string[];
  blockingItems: string[];
  topPmSuggestion: {
    pmName: string;
    score: number;
  } | null;
  pmSuggestions: Array<{
    pmName: string;
    score: number;
  }>;
}

interface PendingScheduleClientProps {
  enrichedJobs: EnrichedJob[];
  readinessCounts: {
    all: number;
    ready: number;
    missingInfo: number;
    needsReview: number;
  };
  territories: Territory[];
}

type FilterTab = "all" | "ready" | "missing-info" | "needs-review";

const READINESS_INFO: Record<SchedulingReadiness, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  ready: {
    label: "Ready to Schedule",
    color: "text-green-700",
    bg: "bg-green-50",
    icon: <CheckCircle className="w-4 h-4" />,
  },
  "missing-colors": {
    label: "Missing Colors",
    color: "text-yellow-700",
    bg: "bg-yellow-50",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  "missing-materials": {
    label: "Missing Materials",
    color: "text-orange-700",
    bg: "bg-orange-50",
    icon: <Package className="w-4 h-4" />,
  },
  "missing-crew": {
    label: "Missing Crew",
    color: "text-red-700",
    bg: "bg-red-50",
    icon: <AlertCircle className="w-4 h-4" />,
  },
  "missing-deposit": {
    label: "Missing Deposit",
    color: "text-red-700",
    bg: "bg-red-50",
    icon: <AlertCircle className="w-4 h-4" />,
  },
  "needs-customer-confirmation": {
    label: "Needs Confirmation",
    color: "text-yellow-700",
    bg: "bg-yellow-50",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  "needs-review": {
    label: "Needs Review",
    color: "text-yellow-700",
    bg: "bg-yellow-50",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  "on-hold": {
    label: "On Hold",
    color: "text-gray-700",
    bg: "bg-gray-50",
    icon: <AlertCircle className="w-4 h-4" />,
  },
  "missing-info": {
    label: "Missing Info",
    color: "text-gray-700",
    bg: "bg-gray-50",
    icon: <AlertCircle className="w-4 h-4" />,
  },
};

export function PendingScheduleClient({
  enrichedJobs,
  readinessCounts,
  territories,
}: PendingScheduleClientProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const filteredJobs = useMemo(() => {
    switch (activeTab) {
      case "ready":
        return enrichedJobs.filter((ej) => ej.readiness === "ready");
      case "missing-info":
        return enrichedJobs.filter((ej) => ej.readiness === "missing-info");
      case "needs-review":
        return enrichedJobs.filter((ej) => ej.readiness === "needs-review");
      default:
        return enrichedJobs;
    }
  }, [enrichedJobs, activeTab]);

  const toggleRowExpanded = (jobId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const getTerritoryColor = (territoryId: TerritoryId) => {
    const territory = territories.find((t) => t.id === territoryId);
    return territory?.color || "#6b7280";
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-provision-gray-mid">
        {(
          [
            { key: "all" as const, label: "All", count: readinessCounts.all },
            { key: "ready" as const, label: "Ready to Schedule", count: readinessCounts.ready },
            { key: "missing-info" as const, label: "Missing Info", count: readinessCounts.missingInfo },
            { key: "needs-review" as const, label: "Needs Review", count: readinessCounts.needsReview },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-provision-orange text-provision-orange"
                : "border-transparent text-provision-gray-text hover:text-provision-charcoal"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Jobs Table */}
      <div className="card overflow-hidden">
        {filteredJobs.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-8 h-8 text-provision-gray-mid mx-auto mb-2" />
            <p className="text-provision-gray-text">No jobs in this category</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-provision-gray-mid bg-provision-charcoal-dark">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white">Job / Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white">Territory</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white">Suggested PM</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-white">Revenue</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-white">Est. Hours</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white">Readiness</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white">Missing Items</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((ej) => {
                  const isExpanded = expandedRows.has(ej.job.id);
                  const readinessInfo = READINESS_INFO[ej.readiness];

                  return (
                    <tbody key={ej.job.id}>
                      <tr className="border-b border-provision-gray-mid hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="font-semibold provision-charcoal text-sm">{ej.job.name}</div>
                            <div className="text-xs text-provision-gray-text">{ej.job.address}</div>
                            <div className="text-xs text-provision-gray-text">{ej.job.zip}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: ej.territory.color }}
                            />
                            <span className="text-sm font-medium provision-charcoal">{ej.territory.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {ej.topPmSuggestion ? (
                            <div className="pill text-sm">
                              <span className="font-medium">{ej.topPmSuggestion.pmName}</span>
                              <span className="ml-1 text-xs text-provision-gray-text">
                                {ej.topPmSuggestion.score}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-provision-gray-text">No suggestion</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold provision-orange">
                            ${(ej.job.value || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold provision-charcoal">
                            {ej.job.estimatedHours || 0}h
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${readinessInfo.color} ${readinessInfo.bg}`}
                          >
                            {readinessInfo.icon}
                            {readinessInfo.label}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {ej.missingItems.length > 0 || ej.blockingItems.length > 0 ? (
                            <div className="text-xs">
                              {ej.blockingItems.length > 0 && (
                                <div className="text-red-600 font-semibold mb-1">
                                  {ej.blockingItems[0]}
                                </div>
                              )}
                              {ej.missingItems.length > 0 && (
                                <div className="text-yellow-600">+{ej.missingItems.length} more</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-provision-gray-text">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleRowExpanded(ej.job.id)}
                            className="inline-flex items-center justify-center text-provision-orange hover:bg-provision-orange hover:bg-opacity-10 p-1 rounded transition-colors"
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <tr className="border-b border-provision-gray-mid bg-gray-50">
                          <td colSpan={8} className="px-4 py-4">
                            <div className="space-y-4">
                              {/* Job Details */}
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="font-semibold provision-charcoal">Project Type:</span>
                                  <p className="text-provision-gray-text">{ej.job.projectType || "N/A"}</p>
                                </div>
                                <div>
                                  <span className="font-semibold provision-charcoal">Current PM:</span>
                                  <p className="text-provision-gray-text">{ej.job.pmName || "Unassigned"}</p>
                                </div>
                                <div>
                                  <span className="font-semibold provision-charcoal">Crew:</span>
                                  <p className="text-provision-gray-text">{ej.job.crew || "Not assigned"}</p>
                                </div>
                                <div>
                                  <span className="font-semibold provision-charcoal">Color Status:</span>
                                  <p className="text-provision-gray-text">{ej.job.colorStatus || "Not started"}</p>
                                </div>
                              </div>

                              {/* Blocking/Missing Items */}
                              {(ej.blockingItems.length > 0 || ej.missingItems.length > 0) && (
                                <div className="space-y-2 pt-2 border-t border-provision-gray-mid">
                                  {ej.blockingItems.length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold text-red-600 mb-1">BLOCKING ITEMS:</p>
                                      <ul className="space-y-1">
                                        {ej.blockingItems.map((item, idx) => (
                                          <li key={idx} className="text-xs text-red-600 flex items-center gap-2">
                                            <AlertTriangle className="w-3 h-3" />
                                            {item}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {ej.missingItems.length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold text-yellow-600 mb-1">TO-DO ITEMS:</p>
                                      <ul className="space-y-1">
                                        {ej.missingItems.map((item, idx) => (
                                          <li key={idx} className="text-xs text-yellow-600 flex items-center gap-2">
                                            <AlertCircle className="w-3 h-3" />
                                            {item}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* All PM Suggestions */}
                              {ej.pmSuggestions.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-provision-gray-mid">
                                  <p className="text-xs font-semibold provision-charcoal">PM SUGGESTIONS:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {ej.pmSuggestions.map((pm, idx) => (
                                      <div key={idx} className="pill text-xs">
                                        {pm.pmName} <span className="text-provision-gray-text">({pm.score}%)</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* View Job Action */}
                              <div className="pt-2 border-t border-provision-gray-mid">
                                <a
                                  href={`/pipeline?job=${ej.job.djJobId}`}
                                  className="inline-flex items-center gap-2 text-sm font-semibold text-provision-orange hover:text-provision-charcoal transition-colors"
                                >
                                  View in Pipeline
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend / Help Section */}
      <div className="card bg-provision-gray-mid bg-opacity-5 p-4">
        <h3 className="text-sm font-semibold provision-charcoal mb-3">Readiness Status Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="flex gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-600">Ready to Schedule</p>
              <p className="text-provision-gray-text">All prerequisites met, can be scheduled immediately</p>
            </div>
          </div>
          <div className="flex gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-600">Needs Review</p>
              <p className="text-provision-gray-text">Missing non-critical items, review before scheduling</p>
            </div>
          </div>
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-600">Blocking Issues</p>
              <p className="text-provision-gray-text">Critical items missing, cannot schedule yet</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
