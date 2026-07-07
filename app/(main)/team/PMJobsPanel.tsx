"use client";

import { useState } from "react";
import type { PipelineJob } from "@/lib/types";
import { ChevronDown, ChevronUp } from "lucide-react";

interface PMJobsPanelProps {
  pmName: string;
  jobs: PipelineJob[];
}

const STAGE_COLORS: Record<string, string> = {
  "In Progress": "bg-green-100 text-green-700",
  "Scheduled": "bg-provision-teal-light text-provision-teal",
  "Ready to Start": "bg-orange-100 text-orange-700",
  "Materials Needed": "bg-purple-100 text-purple-700",
  "Needs Confirmation": "bg-blue-100 text-blue-700",
  "Final Walkthrough": "bg-indigo-100 text-indigo-700",
  "Pending Payment": "bg-pink-100 text-pink-700",
  "Pending Schedule": "bg-gray-100 text-gray-600",
};

function groupByStage(jobs: PipelineJob[]): Record<string, PipelineJob[]> {
  const grouped: Record<string, PipelineJob[]> = {};
  for (const job of jobs) {
    const stage = job.productionStage || "Pending Schedule";
    if (!grouped[stage]) grouped[stage] = [];
    grouped[stage].push(job);
  }
  return grouped;
}

function money(n: number | null | undefined) {
  if (n == null) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

export function PMJobsPanel({ pmName, jobs }: PMJobsPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const pmJobs = jobs.filter((j) => j.pmName === pmName);
  const grouped = groupByStage(pmJobs);
  const totalRevenue = pmJobs.reduce((sum, j) => sum + (j.value || 0), 0);
  const totalHours = pmJobs.reduce((sum, j) => sum + (j.estimatedHours || 0), 0);

  return (
    <div className="mt-4 pt-4 border-t border-provision-gray-mid">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between hover:bg-provision-gray/50 transition-colors px-2 py-1.5 rounded-lg"
      >
        <div className="text-xs font-bold text-provision-gray-text uppercase tracking-wide">
          Assigned Jobs ({pmJobs.length})
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-provision-gray-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-provision-gray-muted" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 text-xs bg-provision-gray/30 rounded-lg p-2">
            <div>
              <div className="text-provision-gray-text font-semibold">Active Jobs</div>
              <div className="text-provision-navy font-bold text-sm">{pmJobs.length}</div>
            </div>
            <div>
              <div className="text-provision-gray-text font-semibold">Revenue</div>
              <div className="text-provision-navy font-bold text-sm">{money(totalRevenue)}</div>
            </div>
            <div>
              <div className="text-provision-gray-text font-semibold">Hours</div>
              <div className="text-provision-navy font-bold text-sm">{totalHours}h</div>
            </div>
          </div>

          {/* Jobs table */}
          {Object.entries(grouped).map(([stage, stageJobs]) => (
            <div key={stage}>
              <div className="text-[11px] font-bold text-provision-gray-text uppercase tracking-wide mt-2 mb-1">
                {stage} ({stageJobs.length})
              </div>
              <div className="space-y-1">
                {stageJobs.map((job) => (
                  <div key={job.id} className="bg-provision-gray/20 rounded-lg p-2 text-xs space-y-0.5">
                    <div className="font-semibold text-provision-navy flex items-start justify-between gap-2">
                      <span className="truncate flex-1">{job.name}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${STAGE_COLORS[stage] || "bg-gray-100 text-gray-600"}`}>
                        {stage}
                      </span>
                    </div>
                    <div className="text-provision-gray-text">{job.address}</div>
                    <div className="flex justify-between text-provision-gray-text">
                      <span>Start: {job.startDate ? new Date(job.startDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</span>
                      <span>{job.crew || "—"}</span>
                      <span className="font-semibold text-provision-navy">{money(job.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
