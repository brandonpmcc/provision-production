"use client";

import { useState } from "react";
import type { PipelineJob, Crew, ProductionStage } from "@/lib/types";
import { JobEditPanel } from "./JobEditPanel";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Wrench,
  Users,
  Star,
  Zap,
} from "lucide-react";

const STAGES: ProductionStage[] = [
  "Pending Schedule",
  "Needs Confirmation",
  "Scheduled",
  "Materials Needed",
  "Ready to Start",
  "In Progress",
  "Final Walkthrough",
  "Pending Payment",
  "Completed",
];

const STAGE_COLORS: Record<ProductionStage, string> = {
  "Pending Schedule":   "bg-gray-100 text-gray-700 border-gray-200",
  "Needs Confirmation": "bg-yellow-100 text-yellow-800 border-yellow-200",
  Scheduled:            "bg-blue-100 text-blue-800 border-blue-200",
  "Materials Needed":   "bg-orange-100 text-orange-800 border-orange-200",
  "Ready to Start":     "bg-cyan-100 text-cyan-800 border-cyan-200",
  "In Progress":        "bg-green-100 text-green-800 border-green-200",
  "Final Walkthrough":  "bg-purple-100 text-purple-800 border-purple-200",
  "Pending Payment":    "bg-pink-100 text-pink-800 border-pink-200",
  Completed:            "bg-emerald-100 text-emerald-800 border-emerald-200",
};

function money(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function ScoreDot({ score }: { score: number | null }) {
  if (!score) return null;
  const color = score >= 4.5 ? "bg-green-500" : score >= 3 ? "bg-yellow-400" : "bg-red-500";
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold text-white px-1.5 py-0.5 rounded-full ${color}`}>
      <Star className="w-2.5 h-2.5" />
      {score}
    </span>
  );
}

function StatusIcon({ ok, warn }: { ok: boolean; warn?: boolean }) {
  if (ok)   return <CheckCircle className="w-3 h-3 text-green-500" />;
  if (warn) return <AlertCircle className="w-3 h-3 text-yellow-500" />;
  return      <Clock className="w-3 h-3 text-gray-300" />;
}

interface Props {
  jobs: PipelineJob[];
  crews: Crew[];
  role: string;
}

export function PipelineBoard({ jobs, crews, role }: Props) {
  const [selectedJobId, setSelectedJobId]   = useState<string | null>(null);
  // Track local stage overrides — key: job.id, value: overridden ProductionStage
  const [stageOverrides, setStageOverrides] = useState<Record<string, ProductionStage>>({});
  const [movingJobId, setMovingJobId]       = useState<string | null>(null);

  // Merge overrides into the job list
  const displayJobs = jobs.map((j) =>
    stageOverrides[j.id] ? { ...j, productionStage: stageOverrides[j.id] } : j
  );

  const selectedJob = selectedJobId ? displayJobs.find((j) => j.id === selectedJobId) ?? null : null;

  async function moveStage(job: PipelineJob, newStage: ProductionStage) {
    if (!job.dealId) return;
    setMovingJobId(job.id);
    // Optimistic update immediately
    setStageOverrides((prev) => ({ ...prev, [job.id]: newStage }));
    try {
      await fetch("/api/production/move-stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId: job.dealId, productionStage: newStage }),
      });
    } catch {
      // Revert on error
      setStageOverrides((prev) => { const n = { ...prev }; delete n[job.id]; return n; });
    } finally {
      setMovingJobId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-provision-charcoal-dark">Pipeline</h1>
          <p className="text-sm text-provision-gray-text">
            {jobs.length} active jobs · {jobs.filter((j) => j.isActivated).length} tracked in production
            {role === "pm" && (
              <span className="ml-2 text-provision-orange-dark font-medium">(your jobs only)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-provision-gray-text">
          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> Confirmed</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-gray-300" /> Pending</span>
          <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-yellow-500" /> Needs attention</span>
        </div>
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto -mx-6 px-6 pb-4">
        <div className="flex gap-3 min-w-max">
          {STAGES.map((stage) => {
            const stageJobs = displayJobs.filter((j) => j.productionStage === stage);
            const stageValue = stageJobs.reduce((sum, j) => sum + (j.value || 0), 0);
            const stageHours = stageJobs.reduce((sum, j) => sum + (j.estimatedHours || 0), 0);

            return (
              <div key={stage} className="w-60 flex-shrink-0">
                {/* Stage header */}
                <div className={`rounded-md border px-2 py-1.5 mb-1.5 ${STAGE_COLORS[stage]}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs">{stage}</span>
                    <span className="text-xs font-bold">{stageJobs.length}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] mt-0.5 opacity-75">
                    {stageValue > 0 && <span>{money(stageValue)}</span>}
                    {stageHours > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />{stageHours}h
                      </span>
                    )}
                  </div>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {stageJobs.map((j) => {
                    const hasSpecialMaterials = Boolean(j.specialMaterialsWarning);
                    const needsAttention =
                      !j.customerConfirmedStart &&
                      ["Scheduled", "Ready to Start", "In Progress"].includes(stage);

                    return (
                      <button
                        key={j.id}
                        onClick={() => setSelectedJobId(j.id)}
                        className={`w-full text-left bg-white rounded-md p-2.5 shadow-sm border text-xs transition hover:shadow-md hover:-translate-y-px active:translate-y-0 ${
                          selectedJobId === j.id
                            ? "border-provision-orange ring-1 ring-provision-orange/20"
                            : hasSpecialMaterials
                            ? "border-orange-300"
                            : needsAttention
                            ? "border-yellow-300"
                            : "border-provision-gray-mid"
                        }`}
                      >
                        {/* Job name + new-job indicator */}
                        <div className="flex items-start justify-between gap-1">
                          <div className="font-semibold truncate text-provision-charcoal-dark flex-1">
                            {j.name}
                          </div>
                          {!j.isActivated && (
                            <span title="From DripJobs — not yet activated in production">
                              <Zap className="w-3 h-3 text-provision-orange shrink-0 mt-0.5" />
                            </span>
                          )}
                        </div>

                        {/* Value + hours + location */}
                        <div className="text-provision-gray-text truncate mt-0.5">
                          {money(j.value)}
                          {j.estimatedHours ? ` · ${j.estimatedHours}h` : ""}
                          {j.city ? ` · ${j.city}` : j.zip ? ` · ${j.zip}` : ""}
                        </div>

                        {/* Budget breakdown */}
                        {(j.estimatedLaborCost || j.estimatedMaterials) && (
                          <div className="text-provision-gray-text mt-0.5 truncate text-[10px]">
                            {j.estimatedLaborCost ? `Labor: ${money(j.estimatedLaborCost)}` : ""}
                            {j.estimatedLaborCost && j.estimatedMaterials ? " · " : ""}
                            {j.estimatedMaterials ? `Mat: ${money(j.estimatedMaterials)}` : ""}
                          </div>
                        )}

                        {/* Customer contact */}
                        {j.customerPhone && (
                          <div className="text-provision-teal mt-0.5 truncate text-[10px] font-semibold">
                            📞 {j.customerPhone}
                          </div>
                        )}

                        {/* Project type */}
                        {j.projectType && (
                          <div className="text-provision-gray-text mt-0.5 truncate">
                            {j.projectType}
                          </div>
                        )}

                        {/* PM */}
                        {j.pmName && (
                          <div className="text-provision-gray-text mt-0.5 truncate">
                            {j.pmName}
                          </div>
                        )}

                        {/* Crew */}
                        {j.crew && (
                          <div className="flex items-center gap-1 mt-1.5 text-provision-charcoal">
                            <Users className="w-3 h-3 shrink-0" />
                            <span className="truncate">{j.crew}</span>
                            {j.crew2 && <span className="text-provision-gray-text">+ {j.crew2}</span>}
                          </div>
                        )}

                        {/* Dates */}
                        {j.startDate && (
                          <div className="text-provision-gray-text mt-1">
                            {j.startDate}{j.endDate ? ` → ${j.endDate}` : ""}
                          </div>
                        )}

                        {/* Status icon row */}
                        <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-provision-gray-mid">
                          <span title="Customer confirmed">
                            <StatusIcon ok={j.customerConfirmedStart} warn={needsAttention} />
                          </span>
                          <span title="Crew confirmed">
                            <StatusIcon ok={j.crewConfirmed} />
                          </span>
                          <span title="Colors">
                            <StatusIcon ok={j.colorStatus === "Complete"} warn={j.colorStatus === "In Progress"} />
                          </span>
                          <span title="Materials">
                            <StatusIcon ok={j.materialStatus === "Received"} warn={j.materialStatus === "Backordered"} />
                          </span>
                          {j.companyCamUrl && (
                            <span title="CompanyCam linked">
                              <CheckCircle className="w-3 h-3 text-blue-400" />
                            </span>
                          )}
                          {hasSpecialMaterials && (
                            <span title={j.specialMaterialsWarning || "Special materials"}>
                              <Wrench className="w-3 h-3 text-orange-500" />
                            </span>
                          )}
                          <div className="ml-auto">
                            <ScoreDot score={j.scoreAvg} />
                          </div>
                        </div>

                        {/* Move to stage — only for coordinators/managers, only if has dealId */}
                        {role !== "pm" && j.dealId && (
                          <div className="mt-2 pt-1.5 border-t border-provision-gray-mid">
                            <select
                              value=""
                              onChange={(e) => {
                                e.stopPropagation();
                                if (e.target.value) moveStage(j, e.target.value as ProductionStage);
                                e.target.value = "";
                              }}
                              onClick={(e) => e.stopPropagation()}
                              disabled={movingJobId === j.id}
                              className="w-full text-[10px] text-provision-gray-text bg-provision-gray border border-provision-gray-mid rounded px-1.5 py-1 cursor-pointer hover:border-provision-orange focus:border-provision-orange outline-none transition disabled:opacity-50"
                            >
                              <option value="" disabled>
                                {movingJobId === j.id ? "Moving…" : "▸ Move to stage…"}
                              </option>
                              {STAGES.filter(s => s !== j.productionStage && s !== "Completed").map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </button>
                    );
                  })}
                  {stageJobs.length === 0 && (
                    <div className="py-4 text-center opacity-30 hover:opacity-50 transition-opacity">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/huey-mascot.png" alt="" className="w-8 h-9 mx-auto mb-1 object-contain" />
                      <div className="text-[10px] text-provision-gray-text">empty</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit panel */}
      {selectedJob && (
        <JobEditPanel
          job={selectedJob}
          crews={crews}
          allJobs={jobs}
          onClose={() => setSelectedJobId(null)}
        />
      )}
    </div>
  );
}
