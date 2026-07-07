"use client";

import { useState } from "react";
import type { ProductionJob } from "@/lib/types";
import {
  MapPin, Calendar, Clock, CheckCircle2, AlertCircle,
  Loader2, HardHat, Phone, Flag, ChevronDown, ChevronUp,
} from "lucide-react";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmt(d: string | null) {
  if (!d) return "TBD";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function stageBadge(stage: string | null) {
  const map: Record<string, { label: string; cls: string }> = {
    "Needs Confirmation": { label: "Needs Confirmation", cls: "bg-blue-100 text-blue-700 border-blue-200" },
    "Scheduled":          { label: "Scheduled",          cls: "bg-provision-teal-light text-provision-teal border-provision-teal/20" },
    "Materials Needed":   { label: "Materials Needed",   cls: "bg-purple-100 text-purple-700 border-purple-200" },
    "Ready to Start":     { label: "Ready to Start",     cls: "bg-orange-100 text-orange-700 border-orange-200" },
    "In Progress":        { label: "In Progress",        cls: "bg-green-100 text-green-700 border-green-200" },
    "Final Walkthrough":  { label: "Final Walkthrough",  cls: "bg-teal-100 text-teal-700 border-teal-200" },
    "Pending Payment":    { label: "Pending Payment",    cls: "bg-indigo-100 text-indigo-700 border-indigo-200" },
    "Completed":          { label: "Completed",          cls: "bg-gray-100 text-gray-500 border-gray-200" },
  };
  const info = map[stage ?? ""] ?? { label: stage ?? "Unknown", cls: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${info.cls}`}>
      {info.label}
    </span>
  );
}

const ACTIVE_STAGES = new Set(["Needs Confirmation","Scheduled","Materials Needed","Ready to Start","In Progress","Final Walkthrough"]);

// ─── Job card ──────────────────────────────────────────────────────────────────

function JobCard({ job, token }: { job: ProductionJob; token: string }) {
  const [expanded, setExpanded]     = useState(false);
  const [accepting, setAccepting]   = useState(false);
  const [accepted, setAccepted]     = useState(job.crewConfirmed);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted]   = useState(job.stage === "Final Walkthrough" || job.stage === "Completed");
  const [error, setError]           = useState<string | null>(null);

  const isActive = ACTIVE_STAGES.has(job.stage ?? "");

  async function handleAccept() {
    if (accepted || accepting) return;
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch("/api/production/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productionId: job.id, token }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setAccepted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error confirming job");
    } finally {
      setAccepting(false);
    }
  }

  async function handleComplete() {
    if (completed || completing) return;
    setCompleting(true);
    setError(null);
    try {
      const res = await fetch("/api/production/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productionId: job.id, token }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setCompleted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error marking complete");
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${
      completed ? "border-gray-200 opacity-75" :
      accepted  ? "border-provision-teal" :
      "border-provision-orange"
    }`}>
      {/* Header */}
      <div
        className="p-4 flex items-start justify-between gap-3 cursor-pointer"
        onClick={() => setExpanded(x => !x)}
      >
        <div className="flex-1 min-w-0">
          <div className="font-display font-black text-provision-navy text-base uppercase tracking-tight leading-tight">
            {job.job}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-provision-gray-text">
            <Calendar className="w-3 h-3 text-provision-orange flex-shrink-0" />
            {fmt(job.startDate)} → {fmt(job.endDate)}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {stageBadge(job.stage)}
          {expanded ? <ChevronUp className="w-4 h-4 text-provision-gray-muted" /> : <ChevronDown className="w-4 h-4 text-provision-gray-muted" />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-provision-gray-mid">
          <div className="pt-3 space-y-2 text-sm">
            {job.notes && (
              <div className="rounded-lg bg-provision-gray p-3 text-provision-gray-text text-xs">
                <span className="font-bold text-provision-navy">Notes: </span>{job.notes}
              </div>
            )}
            {job.specialMaterialsWarning && (
              <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-xs text-yellow-800 flex gap-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span><strong>Special materials: </strong>{job.specialMaterialsWarning}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Action buttons */}
          {isActive && !completed && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Accept job */}
              <button
                onClick={handleAccept}
                disabled={accepted || accepting}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold uppercase tracking-wide transition-all ${
                  accepted
                    ? "bg-provision-teal text-white cursor-default"
                    : "bg-provision-teal-light text-provision-teal border-2 border-provision-teal hover:bg-provision-teal hover:text-white active:scale-95"
                }`}
              >
                {accepting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : accepted ? (
                  <><CheckCircle2 className="w-4 h-4" /> Accepted</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Accept Job</>
                )}
              </button>

              {/* Mark complete */}
              <button
                onClick={handleComplete}
                disabled={completing || completed}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold uppercase tracking-wide transition-all ${
                  completed
                    ? "bg-green-500 text-white cursor-default"
                    : "bg-green-50 text-green-700 border-2 border-green-500 hover:bg-green-500 hover:text-white active:scale-95"
                }`}
              >
                {completing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : completed ? (
                  <><Flag className="w-4 h-4" /> Done!</>
                ) : (
                  <><Flag className="w-4 h-4" /> Mark Complete</>
                )}
              </button>
            </div>
          )}

          {completed && (
            <div className="flex items-center gap-2 text-sm text-green-600 font-semibold justify-center py-2">
              <CheckCircle2 className="w-4 h-4" />
              Job marked complete — PM will do final walkthrough
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main portal ───────────────────────────────────────────────────────────────

export function CrewPortalClient({
  crewName,
  token,
  jobs,
}: {
  crewName: string;
  token: string;
  jobs: ProductionJob[];
}) {
  const activeJobs = jobs.filter(j => ACTIVE_STAGES.has(j.stage ?? ""));
  const doneJobs   = jobs.filter(j => !ACTIVE_STAGES.has(j.stage ?? ""));
  const nextJob    = activeJobs.find(j => j.startDate && new Date(j.startDate + "T00:00:00") >= new Date());
  const unconfirmed = activeJobs.filter(j => !j.crewConfirmed).length;

  return (
    <div className="min-h-screen bg-provision-navy">
      {/* Header */}
      <div className="bg-provision-charcoal border-b border-white/10 px-5 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-provision-orange flex items-center justify-center flex-shrink-0">
            <HardHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-display font-black text-white text-lg uppercase tracking-wide leading-tight">
              {crewName}
            </div>
            <div className="text-[10px] text-provision-teal uppercase tracking-widest font-semibold">
              Pro-Vision Painting · Crew Portal
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Active Jobs",   val: activeJobs.length,   color: "text-provision-orange" },
            { label: "Need Confirm",  val: unconfirmed,          color: unconfirmed > 0 ? "text-yellow-400" : "text-white/40" },
            { label: "Next Start",    val: nextJob ? new Date(nextJob.startDate! + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—", color: "text-provision-teal" },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-provision-charcoal rounded-xl p-3 text-center border border-white/10">
              <div className={`font-display font-black text-xl leading-tight ${color}`}>{val}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Unconfirmed banner */}
        {unconfirmed > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 text-yellow-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            You have {unconfirmed} job{unconfirmed !== 1 ? "s" : ""} waiting for your acceptance. Tap each job to confirm.
          </div>
        )}

        {/* Active jobs */}
        {activeJobs.length === 0 ? (
          <div className="bg-provision-charcoal rounded-2xl border border-white/10 p-8 text-center">
            <HardHat className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <div className="text-white/60 text-sm">No active jobs right now. Check back soon!</div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-white/30 uppercase tracking-widest px-1">
              Your Jobs ({activeJobs.length})
            </div>
            {activeJobs.map(job => (
              <JobCard key={job.id} job={job} token={token} />
            ))}
          </div>
        )}

        {/* Completed jobs */}
        {doneJobs.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-white/20 uppercase tracking-widest px-1">
              Completed / Closed ({doneJobs.length})
            </div>
            {doneJobs.slice(0, 5).map(job => (
              <div key={job.id} className="bg-white/5 rounded-xl px-4 py-2.5 flex items-center justify-between">
                <span className="text-white/40 text-sm truncate">{job.job}</span>
                {stageBadge(job.stage)}
              </div>
            ))}
          </div>
        )}

        {/* PM contact */}
        <div className="bg-provision-charcoal rounded-2xl border border-white/10 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-provision-orange/20 flex items-center justify-center flex-shrink-0">
            <Phone className="w-4 h-4 text-provision-orange" />
          </div>
          <div>
            <div className="text-xs font-bold text-white/60 uppercase tracking-wide">Questions?</div>
            <div className="text-sm text-white font-semibold">Call or text your Project Manager</div>
          </div>
        </div>

        <div className="text-center text-[10px] text-white/15 pb-4">
          Pro-Vision Painting · Crew Portal · Bookmark this link
        </div>
      </div>
    </div>
  );
}
