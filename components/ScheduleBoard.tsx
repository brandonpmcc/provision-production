"use client";

import { useState } from "react";
import type { ProductionJob } from "@/lib/types";

const COLOR_MAP: Record<string, string> = {
  Plum: "#6B3FA0", Purple: "#9333EA", Yellow: "#EAB308", Tomato: "#EF4444",
  Gold: "#CA8A04", Orange: "#F57C1F", Buttercream: "#FEF9C3", Periwinkle: "#A5B4FC",
  Pink: "#EC4899", Turquoise: "#06B6D4", Mint: "#86EFAC", Blush: "#FBCFE8",
  Red: "#DC2626", Thistle: "#D8B4FE", "Dark Blue": "#1E3A8A", Green: "#16A34A",
  "Sky Blue": "#7DD3FC", Teal: "#14B8A6", "Light Blue": "#BAE6FD", Gray: "#9CA3AF",
  Seafoam: "#5EEAD4", Salmon: "#FB923C",
};

const STAGE_PILL: Record<string, string> = {
  "Scheduled":         "bg-blue-100 text-blue-800",
  "In Progress":       "bg-green-100 text-green-800",
  "Ready to Start":    "bg-cyan-100 text-cyan-800",
  "Materials Needed":  "bg-orange-100 text-orange-800",
  "Final Walkthrough": "bg-purple-100 text-purple-800",
};

interface Props {
  jobs: ProductionJob[];
  crewColors: Record<string, string>; // crewName -> color name
  weeklyTarget: number | null;
}

function getWeekDays(referenceDate: Date): Date[] {
  const d = new Date(referenceDate);
  const day = d.getDay(); // 0=Sun
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd;
  });
}

function getMonthDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7; // Mon start
  const cells: (Date | null)[] = Array(startPad).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(year, month, d));
  }
  return cells;
}

function toYMD(d: Date): string {
  return d.toISOString().split("T")[0];
}

function fmtDay(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
}

function fmtMonthYear(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function jobsOnDay(jobs: ProductionJob[], dateStr: string): ProductionJob[] {
  return jobs.filter((j) => {
    if (!j.startDate) return false;
    const start = j.startDate;
    const end = j.endDate || j.startDate;
    return dateStr >= start && dateStr <= end;
  });
}

export function ScheduleBoard({ jobs, crewColors, weeklyTarget }: Props) {
  const now = new Date();
  const [view, setView] = useState<"week" | "month">("week");
  const [weekRef, setWeekRef] = useState(now);
  const [monthRef, setMonthRef] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const scheduledJobs = jobs.filter((j) => j.startDate);
  const weekDays = getWeekDays(weekRef);
  const todayStr = toYMD(now);

  function prevWeek() {
    const d = new Date(weekRef);
    d.setDate(d.getDate() - 7);
    setWeekRef(d);
  }
  function nextWeek() {
    const d = new Date(weekRef);
    d.setDate(d.getDate() + 7);
    setWeekRef(d);
  }
  function prevMonth() {
    setMonthRef((m) => {
      if (m.month === 0) return { year: m.year - 1, month: 11 };
      return { year: m.year, month: m.month - 1 };
    });
  }
  function nextMonth() {
    setMonthRef((m) => {
      if (m.month === 11) return { year: m.year + 1, month: 0 };
      return { year: m.year, month: m.month + 1 };
    });
  }

  const crewColorHex = (name: string | null) =>
    name && crewColors[name] ? COLOR_MAP[crewColors[name]] || "#9CA3AF" : "#9CA3AF";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-provision-charcoal-dark">Schedule</h1>
          <p className="text-sm text-provision-gray-text">
            {scheduledJobs.length} jobs with dates scheduled
            {weeklyTarget ? ` · ${weeklyTarget.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} weekly target` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-provision-gray-mid overflow-hidden text-sm">
            <button
              onClick={() => setView("week")}
              className={`px-4 py-1.5 font-medium transition ${
                view === "week" ? "bg-provision-charcoal text-white" : "bg-white text-provision-gray-text hover:bg-provision-gray"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView("month")}
              className={`px-4 py-1.5 font-medium transition border-l border-provision-gray-mid ${
                view === "month" ? "bg-provision-charcoal text-white" : "bg-white text-provision-gray-text hover:bg-provision-gray"
              }`}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {scheduledJobs.length === 0 && (
        <div className="card text-sm text-provision-gray-text text-center py-8">
          No jobs have start dates yet. Open a job card and set start dates to see them on the calendar.
        </div>
      )}

      {/* ── WEEK VIEW ── */}
      {view === "week" && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevWeek} className="p-1.5 rounded hover:bg-provision-gray transition text-provision-gray-text">‹</button>
            <span className="text-sm font-semibold text-provision-charcoal-dark">
              {fmtDate(weekDays[0])} – {fmtDate(weekDays[6])}
            </span>
            <button onClick={nextWeek} className="p-1.5 rounded hover:bg-provision-gray transition text-provision-gray-text">›</button>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {/* Day headers */}
            {weekDays.map((d) => {
              const isToday = toYMD(d) === todayStr;
              return (
                <div key={d.toString()} className={`text-center pb-2 border-b ${isToday ? "border-provision-orange" : "border-provision-gray-mid"}`}>
                  <div className={`text-xs font-semibold ${isToday ? "text-provision-orange-dark" : "text-provision-gray-text"}`}>
                    {fmtDay(d)}
                  </div>
                  <div className={`text-sm font-bold mt-0.5 ${isToday ? "text-provision-orange-dark" : "text-provision-charcoal-dark"}`}>
                    {d.getDate()}
                  </div>
                </div>
              );
            })}

            {/* Job slots */}
            {weekDays.map((d) => {
              const dateStr = toYMD(d);
              const dayJobs = jobsOnDay(scheduledJobs, dateStr);
              return (
                <div key={dateStr} className="min-h-20 space-y-1">
                  {dayJobs.map((j) => (
                    <div
                      key={j.id}
                      className="rounded p-1.5 text-white text-[10px] leading-tight"
                      style={{ backgroundColor: crewColorHex(j.crew) }}
                      title={`${j.job} — ${j.crew || "no crew"} — ${j.stage}`}
                    >
                      <div className="font-semibold truncate">{j.job}</div>
                      {j.crew && <div className="opacity-80 truncate">{j.crew}</div>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MONTH VIEW ── */}
      {view === "month" && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded hover:bg-provision-gray transition text-provision-gray-text">‹</button>
            <span className="text-sm font-semibold text-provision-charcoal-dark">
              {fmtMonthYear(monthRef.year, monthRef.month)}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded hover:bg-provision-gray transition text-provision-gray-text">›</button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-provision-gray-text py-1">{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-1">
            {getMonthDays(monthRef.year, monthRef.month).map((d, i) => {
              if (!d) return <div key={`pad-${i}`} />;
              const dateStr = toYMD(d);
              const dayJobs = jobsOnDay(scheduledJobs, dateStr);
              const isToday = dateStr === todayStr;
              return (
                <div
                  key={dateStr}
                  className={`min-h-16 p-1 rounded-md border ${
                    isToday ? "border-provision-orange bg-orange-50" : "border-provision-gray-mid bg-white"
                  }`}
                >
                  <div className={`text-xs font-semibold mb-1 ${isToday ? "text-provision-orange-dark" : "text-provision-gray-text"}`}>
                    {d.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayJobs.slice(0, 3).map((j) => (
                      <div
                        key={j.id}
                        className="rounded text-white text-[9px] px-1 py-0.5 truncate"
                        style={{ backgroundColor: crewColorHex(j.crew) }}
                        title={`${j.job} — ${j.crew || "no crew"}`}
                      >
                        {j.job}
                      </div>
                    ))}
                    {dayJobs.length > 3 && (
                      <div className="text-[9px] text-provision-gray-text pl-1">+{dayJobs.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      {scheduledJobs.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs text-provision-gray-text items-center">
          <span className="font-medium">Crews:</span>
          {Array.from(new Set(scheduledJobs.map((j) => j.crew).filter(Boolean))).map((crew) => (
            <div key={crew} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: crewColorHex(crew) }} />
              <span>{crew}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
