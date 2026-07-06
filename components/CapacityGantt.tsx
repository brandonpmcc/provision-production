"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

// ─── Color map (matches capacity/page.tsx) ────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  Plum: "#6B3FA0", Purple: "#9333EA", Yellow: "#EAB308", Tomato: "#EF4444",
  Gold: "#CA8A04", Orange: "#F57C1F", Buttercream: "#D4A017", Periwinkle: "#818CF8",
  Pink: "#EC4899", Turquoise: "#06B6D4", Mint: "#22C55E", Blush: "#F9A8D4",
  Red: "#DC2626", Thistle: "#A855F7", "Dark Blue": "#1E3A8A", Green: "#16A34A",
  "Sky Blue": "#38BDF8", Teal: "#14B8A6", "Light Blue": "#93C5FD", Gray: "#9CA3AF",
  Seafoam: "#5EEAD4", Salmon: "#FB923C",
};

function hexFor(color: string | null) {
  return color ? COLOR_MAP[color] ?? "#9CA3AF" : "#9CA3AF";
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface GanttJob {
  id: string;
  name: string;
  crewName: string;
  crewColor: string | null;
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  hours: number | null;
  stage: string;
  value: number | null;
  hasConflict: boolean;
}

interface Props {
  jobs: GanttJob[];
  todayStr: string;   // YYYY-MM-DD
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const WEEKS = 12;
const TOTAL_DAYS = WEEKS * 7;

function parseLocal(s: string): Date {
  // Treat as local date (avoids UTC midnight timezone shift)
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dayOffset(fromStr: string, toStr: string): number {
  const from = parseLocal(fromStr);
  const to   = parseLocal(toStr);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function addDays(dateStr: string, days: number): string {
  const d = parseLocal(dateStr);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function money(n: number | null) {
  if (!n) return null;
  return n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function CapacityGantt({ jobs, todayStr }: Props) {
  const [tooltip, setTooltip] = useState<{
    job: GanttJob;
    x: number;
    y: number;
  } | null>(null);

  // Only crews with jobs visible in the 12-week window
  const crewNames = [
    ...new Set(
      jobs
        .filter((j) => {
          const start = dayOffset(todayStr, j.startDate);
          const end   = dayOffset(todayStr, j.endDate);
          return end > -7 && start < TOTAL_DAYS; // ±1 week buffer
        })
        .map((j) => j.crewName)
    ),
  ].sort();

  if (crewNames.length === 0) {
    return (
      <div className="text-sm text-provision-gray-text italic py-6 text-center">
        No jobs with start/end dates in the next {WEEKS} weeks.
        Set dates on jobs in the Pipeline to see the timeline.
      </div>
    );
  }

  // Week header labels
  const weekLabels: string[] = [];
  for (let w = 0; w < WEEKS; w++) {
    weekLabels.push(addDays(todayStr, w * 7));
  }

  const conflictCount = jobs.filter((j) => j.hasConflict).length;

  return (
    <div className="space-y-3">
      {conflictCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>{conflictCount} job{conflictCount !== 1 ? "s" : ""}</strong> have overlapping
            dates for the same crew — shown in red below. Reassign or reschedule to resolve.
          </span>
        </div>
      )}

      {/* Scrollable chart */}
      <div className="overflow-x-auto rounded-lg border border-provision-gray-mid">
        <div style={{ minWidth: `${WEEKS * 90 + 192}px` }}>

          {/* Header row */}
          <div className="flex bg-gray-50 border-b border-provision-gray-mid">
            <div className="w-48 shrink-0 px-3 py-2 text-[10px] font-semibold text-provision-gray-text uppercase tracking-wide">
              Crew
            </div>
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${WEEKS}, 1fr)` }}>
              {weekLabels.map((label, i) => (
                <div
                  key={i}
                  className="text-[10px] text-provision-gray-text border-l border-provision-gray-mid px-1.5 py-2"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Crew rows */}
          {crewNames.map((crewName, ri) => {
            const crewJobs = jobs.filter((j) => j.crewName === crewName);
            const crewColor = crewJobs[0]?.crewColor ?? null;
            const hex = hexFor(crewColor);
            const hasConflict = crewJobs.some((j) => j.hasConflict);

            return (
              <div
                key={crewName}
                className={`flex border-b border-provision-gray-mid last:border-0 ${
                  hasConflict ? "bg-red-50/30" : ri % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                }`}
              >
                {/* Crew label */}
                <div className="w-48 shrink-0 flex items-center gap-2 px-3 py-1.5">
                  <div
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: hex }}
                  />
                  <span className="text-xs font-medium text-provision-charcoal-dark truncate">
                    {crewName}
                  </span>
                  {hasConflict && (
                    <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
                  )}
                </div>

                {/* Timeline area */}
                <div
                  className="flex-1 relative"
                  style={{ height: "48px" }}
                >
                  {/* Week column dividers */}
                  {weekLabels.map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 border-l border-provision-gray-mid/60"
                      style={{ left: `${(i / WEEKS) * 100}%` }}
                    />
                  ))}

                  {/* Today marker */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-provision-orange z-10"
                    style={{ left: "0%" }}
                    title="Today"
                  />

                  {/* Job bars */}
                  {crewJobs.map((job) => {
                    const rawStart = dayOffset(todayStr, job.startDate);
                    const rawEnd   = dayOffset(todayStr, job.endDate);
                    // Clamp to visible window (allow slight overflow for ongoing jobs)
                    const clampedStart = Math.max(-1, rawStart);
                    const clampedEnd   = Math.min(TOTAL_DAYS + 1, rawEnd);
                    if (clampedEnd <= clampedStart) return null;

                    const leftPct  = (clampedStart / TOTAL_DAYS) * 100;
                    const widthPct = Math.max(0.8, ((clampedEnd - clampedStart) / TOTAL_DAYS) * 100);
                    const barColor = job.hasConflict ? "#ef4444" : hex;
                    const isShort  = widthPct < 6; // skip label if bar is too narrow

                    return (
                      <div
                        key={job.id}
                        className={`absolute top-2.5 flex items-center rounded text-[10px] text-white font-medium overflow-hidden px-1.5 cursor-default select-none transition-opacity hover:opacity-90 ${
                          job.hasConflict
                            ? "ring-2 ring-red-600 ring-offset-1"
                            : ""
                        }`}
                        style={{
                          left:            `${leftPct}%`,
                          width:           `${widthPct}%`,
                          height:          "26px",
                          backgroundColor: barColor,
                          opacity:         0.88,
                        }}
                        onMouseEnter={(e) =>
                          setTooltip({ job, x: e.clientX, y: e.clientY })
                        }
                        onMouseLeave={() => setTooltip(null)}
                      >
                        {!isShort && (
                          <span className="truncate drop-shadow-sm">{job.name}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-provision-gray-text">
        <div className="flex items-center gap-1.5">
          <div className="w-px h-3 bg-provision-orange" />
          Today
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded bg-red-500 opacity-80 ring-1 ring-red-600" />
          Scheduling conflict
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded bg-blue-400 opacity-80" />
          Active job (hover for details)
        </div>
      </div>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="fixed z-[9999] bg-provision-charcoal-dark text-white text-xs rounded-lg p-3 shadow-xl pointer-events-none max-w-xs"
          style={{ left: tooltip.x + 14, top: tooltip.y - 8 }}
        >
          <div className="font-semibold mb-1">{tooltip.job.name}</div>
          <div className="space-y-0.5 text-white/75">
            <div>{tooltip.job.stage}</div>
            <div>
              {tooltip.job.startDate} → {tooltip.job.endDate}
            </div>
            {tooltip.job.hours && (
              <div>{tooltip.job.hours}h estimated</div>
            )}
            {tooltip.job.value && (
              <div>{money(tooltip.job.value)}</div>
            )}
          </div>
          {tooltip.job.hasConflict && (
            <div className="mt-1.5 flex items-center gap-1 text-red-300 font-medium">
              <AlertTriangle className="w-3 h-3" />
              Scheduling conflict — dates overlap
            </div>
          )}
        </div>
      )}
    </div>
  );
}
