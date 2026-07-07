"use client";

import { useState, useMemo } from "react";
import type { PipelineJob, SchedulingReadiness } from "@/lib/types";
import type { Territory } from "@/lib/territories";
import type { StartDatePrediction } from "@/lib/recommend";
import { PendingQueueMap, getJobCoords, type MapJob } from "./PendingQueueMap";
import {
  CheckCircle, AlertTriangle, AlertCircle, Package,
  MapPin, DollarSign, Clock, User, CalendarDays,
  ChevronRight, Star,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface EnrichedJob {
  job: PipelineJob;
  territory: Territory;
  readiness: SchedulingReadiness;
  missingItems: string[];
  blockingItems: string[];
  topPmSuggestion: { pmName: string; score: number; reasons?: string[]; warnings?: string[] } | null;
  pmSuggestions: Array<{ pmName: string; score: number }>;
  prediction: StartDatePrediction;
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

// ─── Readiness config ────────────────────────────────────────────────────────

const READINESS: Record<SchedulingReadiness, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  "ready":                    { label: "Ready",          color: "text-green-700",  bg: "bg-green-50  border-green-200",  icon: <CheckCircle className="w-3.5 h-3.5" /> },
  "missing-colors":           { label: "Colors needed",  color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  "missing-materials":        { label: "Materials",      color: "text-orange-700", bg: "bg-orange-50 border-orange-200", icon: <Package className="w-3.5 h-3.5" /> },
  "missing-crew":             { label: "No crew",        color: "text-red-700",    bg: "bg-red-50    border-red-200",    icon: <AlertCircle className="w-3.5 h-3.5" /> },
  "missing-deposit":          { label: "No deposit",     color: "text-red-700",    bg: "bg-red-50    border-red-200",    icon: <AlertCircle className="w-3.5 h-3.5" /> },
  "needs-customer-confirmation": { label: "Needs confirm", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  "needs-review":             { label: "Review",         color: "text-gray-600",   bg: "bg-gray-50   border-gray-200",   icon: <AlertCircle className="w-3.5 h-3.5" /> },
  "on-hold":                  { label: "On hold",        color: "text-gray-500",   bg: "bg-gray-50   border-gray-200",   icon: <Clock className="w-3.5 h-3.5" /> },
  "missing-info":             { label: "Missing info",   color: "text-gray-600",   bg: "bg-gray-50   border-gray-200",   icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

// ─── Money helper ─────────────────────────────────────────────────────────────

function money(n: number | null | undefined) {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

// ─── Confidence badge ──────────────────────────────────────────────────────────

function ConfidenceDot({ confidence }: { confidence: "high" | "medium" | "low" }) {
  const map = {
    high:   "bg-provision-teal",
    medium: "bg-yellow-400",
    low:    "bg-gray-300",
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${map[confidence]} flex-shrink-0`} />;
}

// ─── Job card ──────────────────────────────────────────────────────────────────

function JobCard({
  ej,
  isSelected,
  onSelect,
}: {
  ej: EnrichedJob;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const r = READINESS[ej.readiness] ?? READINESS["needs-review"];
  const pm = ej.topPmSuggestion;
  const pred = ej.prediction;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl border-2 transition-all duration-150 p-4 space-y-3 ${
        isSelected
          ? "border-provision-orange shadow-card-orange bg-white"
          : "border-transparent bg-white shadow-card hover:shadow-card-hover hover:border-provision-gray-border"
      }`}
    >
      {/* Row 1: name + territory + readiness */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-display font-black text-[15px] text-provision-navy uppercase tracking-tight leading-tight truncate">
            {ej.job.name || ej.job.address || "Unnamed Job"}
          </div>
          {ej.job.address && ej.job.name && (
            <div className="flex items-center gap-1 text-xs text-provision-gray-text mt-0.5 truncate">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {ej.job.address}
              {ej.job.zip && <span className="text-provision-gray-muted ml-0.5">{ej.job.zip}</span>}
            </div>
          )}
        </div>
        {/* Territory pill */}
        <div
          className="flex-shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-white text-[10px] font-bold uppercase tracking-wide"
          style={{ backgroundColor: ej.territory.color }}
        >
          {ej.territory.name.replace(" Expansion", "")}
        </div>
      </div>

      {/* Row 2: PM suggestion + start date — THE KEY INFO */}
      <div className="grid grid-cols-2 gap-2">
        {/* PM suggestion */}
        <div className={`rounded-lg p-2.5 border ${
          pm ? "bg-provision-orange-light border-provision-orange/20" : "bg-provision-gray border-provision-gray-mid"
        }`}>
          <div className="flex items-center gap-1 mb-1">
            <User className="w-3 h-3 text-provision-orange flex-shrink-0" />
            <span className="text-[10px] font-bold text-provision-orange uppercase tracking-wide">Suggested PM</span>
          </div>
          {pm ? (
            <div>
              <div className="font-display font-black text-[14px] text-provision-navy uppercase leading-tight">
                {pm.pmName.split(" ")[0]}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="h-1 flex-1 rounded-full bg-provision-orange/20 overflow-hidden">
                  <div
                    className="h-full bg-provision-orange rounded-full"
                    style={{ width: `${pm.score}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-provision-orange">{pm.score}%</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-provision-gray-muted italic">None assigned</div>
          )}
        </div>

        {/* Predicted start date */}
        <div className={`rounded-lg p-2.5 border ${
          pred.confidence === "high"
            ? "bg-provision-teal-light border-provision-teal/20"
            : pred.confidence === "medium"
            ? "bg-yellow-50 border-yellow-200"
            : "bg-provision-gray border-provision-gray-mid"
        }`}>
          <div className="flex items-center gap-1 mb-1">
            <CalendarDays className={`w-3 h-3 flex-shrink-0 ${
              pred.confidence === "high" ? "text-provision-teal" :
              pred.confidence === "medium" ? "text-yellow-600" : "text-provision-gray-muted"
            }`} />
            <span className={`text-[10px] font-bold uppercase tracking-wide ${
              pred.confidence === "high" ? "text-provision-teal" :
              pred.confidence === "medium" ? "text-yellow-600" : "text-provision-gray-muted"
            }`}>Predicted Start</span>
          </div>
          <div className="font-display font-black text-[14px] text-provision-navy uppercase leading-tight">
            {pred.suggestedDateFormatted}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <ConfidenceDot confidence={pred.confidence} />
            <span className="text-[10px] text-provision-gray-text truncate">{pred.reason}</span>
          </div>
        </div>
      </div>

      {/* Row 3: Revenue + hours + readiness + type */}
      <div className="flex items-center gap-2 flex-wrap">
        {ej.job.value && (
          <span className="flex items-center gap-1 text-xs font-bold text-provision-navy">
            <DollarSign className="w-3 h-3 text-provision-orange" />
            {money(ej.job.value)}
          </span>
        )}
        {ej.job.estimatedHours && (
          <span className="flex items-center gap-1 text-xs text-provision-gray-text">
            <Clock className="w-3 h-3" />
            {ej.job.estimatedHours}h
          </span>
        )}
        {ej.job.projectType && (
          <span className="text-xs text-provision-gray-text">{ej.job.projectType}</span>
        )}
        {/* Readiness badge */}
        <span className={`ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${r.color} ${r.bg}`}>
          {r.icon}
          {r.label}
        </span>
      </div>

      {/* Row 4: blocking items (if any) */}
      {ej.blockingItems.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs text-red-700 space-y-0.5">
          {ej.blockingItems.slice(0, 2).map((b, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              {b}
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type FilterTab = "all" | "ready" | "needs-info" | "review";

// ─── Main client ──────────────────────────────────────────────────────────────

export function PendingScheduleClient({
  enrichedJobs,
  readinessCounts,
  territories,
}: PendingScheduleClientProps) {
  const [filter, setFilter]   = useState<FilterTab>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortBy, setSortBy]   = useState<"revenue" | "date" | "territory">("revenue");

  // Build filtered + sorted job list
  const filtered = useMemo(() => {
    let list = enrichedJobs;
    if (filter === "ready")      list = list.filter(e => e.readiness === "ready");
    if (filter === "needs-info") list = list.filter(e => e.blockingItems.length > 0);
    if (filter === "review")     list = list.filter(e => e.readiness === "needs-review" || e.missingItems.length > 0);

    return [...list].sort((a, b) => {
      if (sortBy === "revenue")   return (b.job.value ?? 0) - (a.job.value ?? 0);
      if (sortBy === "date")      return a.prediction.daysFromNow - b.prediction.daysFromNow;
      if (sortBy === "territory") return a.territory.name.localeCompare(b.territory.name);
      return 0;
    });
  }, [enrichedJobs, filter, sortBy]);

  // Build map jobs (only jobs that have mappable coordinates)
  const mapJobs: MapJob[] = useMemo(() =>
    filtered.flatMap((ej) => {
      const coords = getJobCoords(ej.job.zip);
      if (!coords) return [];
      return [{
        job: ej.job,
        territory: ej.territory,
        suggestedPm: ej.topPmSuggestion?.pmName ?? null,
        pmScore: ej.topPmSuggestion?.score ?? 0,
        prediction: ej.prediction,
        lat: coords[0],
        lng: coords[1],
      }];
    }),
  [filtered]);

  const filterTabs: { id: FilterTab; label: string; count: number }[] = [
    { id: "all",        label: "All",         count: readinessCounts.all },
    { id: "ready",      label: "Ready",       count: readinessCounts.ready },
    { id: "needs-info", label: "Needs Info",  count: readinessCounts.missingInfo },
    { id: "review",     label: "Review",      count: readinessCounts.needsReview },
  ];

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Filter tabs */}
        <div className="flex gap-1 bg-provision-gray rounded-xl p-1">
          {filterTabs.map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                filter === id
                  ? "bg-white text-provision-charcoal shadow-card"
                  : "text-provision-gray-text hover:text-provision-charcoal"
              }`}
            >
              {label}
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                filter === id ? "bg-provision-orange text-white" : "bg-provision-gray-mid text-provision-gray-text"
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-provision-gray-text uppercase tracking-wide font-semibold">Sort:</span>
          {(["revenue", "date", "territory"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`text-xs px-2.5 py-1 rounded-lg font-bold uppercase tracking-wide transition-all ${
                sortBy === s
                  ? "bg-provision-charcoal text-white"
                  : "text-provision-gray-text hover:text-provision-navy"
              }`}
            >
              {s === "date" ? "Start Date" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-[11px] text-provision-gray-text">
        <span className="font-bold text-provision-navy uppercase tracking-wide">Prediction confidence:</span>
        {[
          { color: "bg-provision-teal", label: "High — based on PM schedule" },
          { color: "bg-yellow-400",     label: "Medium — open slot" },
          { color: "bg-gray-300",       label: "Low — no PM assigned" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
            {label}
          </span>
        ))}
      </div>

      {/* Two-panel layout */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12 text-provision-gray-text">
          <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
          <div className="font-display font-black text-provision-navy uppercase">No jobs in this category</div>
        </div>
      ) : (
        <div className="flex gap-4" style={{ minHeight: 600 }}>
          {/* LEFT: scrollable job cards */}
          <div className="flex-1 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: 700 }}>
            {filtered.map((ej) => (
              <JobCard
                key={ej.job.id}
                ej={ej}
                isSelected={selectedId === ej.job.id}
                onSelect={() => setSelectedId(prev => prev === ej.job.id ? null : ej.job.id)}
              />
            ))}
          </div>

          {/* RIGHT: sticky map */}
          <div className="flex-shrink-0" style={{ width: 420, position: "sticky", top: 24, height: 700 }}>
            {/* Map header */}
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-provision-orange" />
                <span className="text-xs font-bold text-provision-navy uppercase tracking-wide">
                  {mapJobs.length} Jobs on Map
                </span>
              </div>
              {/* Territory legend */}
              <div className="flex gap-2 flex-wrap justify-end">
                {territories.filter(t => t.active).map(t => (
                  <span key={t.id} className="flex items-center gap-1 text-[10px] text-provision-gray-text">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.name.replace(" Expansion", "")}
                  </span>
                ))}
              </div>
            </div>

            <PendingQueueMap
              mapJobs={mapJobs}
              selectedJobId={selectedId}
              onSelectJob={setSelectedId}
            />

            {/* Selected job detail panel */}
            {selectedId && (() => {
              const sel = filtered.find(e => e.job.id === selectedId);
              if (!sel) return null;
              return (
                <div className="mt-2 card border-l-4 border-provision-orange text-sm space-y-2">
                  <div className="font-display font-black text-provision-navy uppercase text-[13px]">
                    {sel.job.name || sel.job.address}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div>
                      <span className="text-provision-gray-text">PM: </span>
                      <span className="font-bold text-provision-orange">{sel.topPmSuggestion?.pmName ?? "Unassigned"}</span>
                    </div>
                    <div>
                      <span className="text-provision-gray-text">Score: </span>
                      <span className="font-bold">{sel.topPmSuggestion?.score ?? 0}%</span>
                    </div>
                    <div>
                      <span className="text-provision-gray-text">Start: </span>
                      <span className="font-bold text-provision-teal">{sel.prediction.suggestedDateFormatted}</span>
                    </div>
                    <div>
                      <span className="text-provision-gray-text">In: </span>
                      <span className="font-bold">{sel.prediction.daysFromNow} days</span>
                    </div>
                    <div className="col-span-2 text-provision-gray-text italic">{sel.prediction.reason}</div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
