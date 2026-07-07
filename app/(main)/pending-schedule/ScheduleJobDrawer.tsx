"use client";

import { useState, useEffect } from "react";
import type { PipelineJob } from "@/lib/types";
import type { Crew } from "@/lib/types";
import type { Territory } from "@/lib/territories";
import type { StartDatePrediction } from "@/lib/recommend";
import {
  X, User, Users, CalendarDays, Clock, DollarSign,
  Calculator, CheckCircle, AlertCircle, Loader2, MapPin,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PM {
  recordId: string;
  name: string;
  email: string;
}

interface ScheduleJobDrawerProps {
  job: PipelineJob;
  territory: Territory;
  suggestedPm: { pmName: string; pmRecordId?: string; score: number } | null;
  prediction: StartDatePrediction;
  crews: Crew[];
  pms: PM[];
  onClose: () => void;
  onScheduled: (jobId: string) => void;
}

// ─── Hour estimate helper ─────────────────────────────────────────────────────

function estimateHours(value: number | null, projectType: string | null): number {
  if (!value) return 0;
  // Rough estimate: $1,000 ≈ 8 labor hours for residential painting
  // Adjust for project type
  const type = (projectType || "").toLowerCase();
  let rate = 8 / 1000; // hours per dollar
  if (type.includes("commercial")) rate = 10 / 1000;  // more complex
  if (type.includes("gutter"))     rate = 4 / 1000;   // faster
  if (type.includes("cabinet"))    rate = 12 / 1000;  // detailed work
  if (type.includes("exterior"))   rate = 7 / 1000;
  if (type.includes("interior"))   rate = 9 / 1000;
  return Math.round(value * rate);
}

function estimateDays(hours: number, crewSize: number): number {
  if (!hours || !crewSize) return 0;
  const hoursPerDay = 8;
  return Math.ceil(hours / (crewSize * hoursPerDay));
}

function addWorkDays(startDate: string, days: number): string {
  const d = new Date(startDate + "T00:00:00");
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++; // skip weekends
  }
  return d.toISOString().split("T")[0];
}

function money(n: number | null | undefined) {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ScheduleJobDrawer({
  job,
  territory,
  suggestedPm,
  prediction,
  crews,
  pms,
  onClose,
  onScheduled,
}: ScheduleJobDrawerProps) {
  // Form state — pre-fill with suggestions
  const [pmRecordId, setPmRecordId] = useState<string>(
    pms.find(p => p.name === suggestedPm?.pmName)?.recordId ?? ""
  );
  const [crewName, setCrewName]     = useState<string>("");
  const [startDate, setStartDate]   = useState<string>(prediction.suggestedDate);
  const [budgetedHours, setBudgetedHours] = useState<string>(
    String(estimateHours(job.value, job.projectType) || "")
  );
  const [materialBudget, setMaterialBudget] = useState<string>("");
  const [notes, setNotes]           = useState<string>("");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [done, setDone]             = useState(false);

  // Auto-calculate end date from start + estimated days
  const crewObj    = crews.find(c => c.name === crewName);
  const crewSize   = 2; // default — TODO pull from Crews table when available
  const hoursNum   = parseInt(budgetedHours) || 0;
  const estDays    = hoursNum > 0 ? estimateDays(hoursNum, crewSize) : null;
  const [endDate, setEndDate] = useState<string>(() =>
    estDays && startDate ? addWorkDays(startDate, estDays) : ""
  );

  // Recalculate end date when hours or start date changes
  useEffect(() => {
    if (hoursNum > 0 && startDate) {
      setEndDate(addWorkDays(startDate, estimateDays(hoursNum, crewSize)));
    }
  }, [hoursNum, startDate, crewSize]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!crewName || !startDate || !endDate) {
      setError("Crew, start date, and end date are required.");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/production/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: job.name,
          dealId: job.dealId,
          pmRecordId: pmRecordId || null,
          crewName,
          startDate,
          endDate,
          budgetedHours: budgetedHours ? parseFloat(budgetedHours) : null,
          materialBudget: materialBudget ? parseFloat(materialBudget.replace(/[$,]/g, "")) : null,
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }

      setDone(true);
      setTimeout(() => onScheduled(job.id), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule job.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-provision-navy/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[520px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-provision-navy px-6 py-5 flex items-start justify-between flex-shrink-0">
          <div>
            <div className="text-[10px] font-bold text-provision-teal uppercase tracking-widest mb-1">
              Schedule Job
            </div>
            <div className="font-display font-black text-white text-xl uppercase tracking-tight leading-tight">
              {job.name || job.address || "Unnamed Job"}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-white/50 text-xs">
              <MapPin className="w-3 h-3" />
              {job.address}{job.zip && ` · ${job.zip}`}
              <span
                className="ml-2 px-2 py-0.5 rounded-full text-white text-[10px] font-bold uppercase"
                style={{ backgroundColor: territory.color }}
              >
                {territory.name}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition p-1 mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Job quick stats */}
        <div className="bg-provision-gray border-b border-provision-gray-mid px-6 py-3 flex gap-6 flex-shrink-0">
          {[
            { label: "Job Value",    val: money(job.value) },
            { label: "Type",         val: job.projectType || "—" },
            { label: "Predicted",    val: prediction.suggestedDateFormatted, accent: true },
          ].map(({ label, val, accent }) => (
            <div key={label}>
              <div className="text-[9px] font-bold text-provision-gray-muted uppercase tracking-widest">{label}</div>
              <div className={`font-display font-black text-sm ${accent ? "text-provision-teal" : "text-provision-navy"}`}>{val}</div>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* PM */}
          <div>
            <label className="section-label flex items-center gap-1.5 mb-2">
              <User className="w-3.5 h-3.5" /> Project Manager
            </label>
            <select
              value={pmRecordId}
              onChange={e => setPmRecordId(e.target.value)}
              className="w-full border border-provision-gray-border rounded-lg px-3 py-2.5 text-sm text-provision-navy focus:ring-2 focus:ring-provision-teal focus:border-provision-teal outline-none bg-white"
            >
              <option value="">— Select PM —</option>
              {pms.map(pm => (
                <option key={pm.recordId} value={pm.recordId}>
                  {pm.name} {suggestedPm?.pmName === pm.name ? "⭐ Suggested" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Crew / Sub */}
          <div>
            <label className="section-label flex items-center gap-1.5 mb-2">
              <Users className="w-3.5 h-3.5" /> Crew / Subcontractor
            </label>
            <select
              value={crewName}
              onChange={e => setCrewName(e.target.value)}
              required
              className="w-full border border-provision-gray-border rounded-lg px-3 py-2.5 text-sm text-provision-navy focus:ring-2 focus:ring-provision-orange focus:border-provision-orange outline-none bg-white"
            >
              <option value="">— Select Crew —</option>
              {crews.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="section-label flex items-center gap-1.5 mb-2">
                <CalendarDays className="w-3.5 h-3.5" /> Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                required
                className="w-full border border-provision-gray-border rounded-lg px-3 py-2.5 text-sm text-provision-navy focus:ring-2 focus:ring-provision-orange outline-none"
              />
              {prediction.confidence === "high" && (
                <div className="text-[10px] text-provision-teal mt-1 font-semibold">
                  ⭐ {prediction.reason}
                </div>
              )}
            </div>
            <div>
              <label className="section-label flex items-center gap-1.5 mb-2">
                <CalendarDays className="w-3.5 h-3.5" /> End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                required
                className="w-full border border-provision-gray-border rounded-lg px-3 py-2.5 text-sm text-provision-navy focus:ring-2 focus:ring-provision-orange outline-none"
              />
            </div>
          </div>

          {/* Budgeted Hours */}
          <div>
            <label className="section-label flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5" /> Budgeted Labor Hours
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={budgetedHours}
              onChange={e => setBudgetedHours(e.target.value)}
              placeholder="e.g. 48"
              className="w-full border border-provision-gray-border rounded-lg px-3 py-2.5 text-sm text-provision-navy focus:ring-2 focus:ring-provision-teal outline-none"
            />
          </div>

          {/* Hour Estimate Calculator */}
          {hoursNum > 0 && (
            <div className="rounded-xl border border-provision-teal/20 bg-provision-teal-light p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-provision-teal text-xs font-bold uppercase tracking-wide">
                <Calculator className="w-3.5 h-3.5" />
                Duration Estimate
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total Hours",  val: `${hoursNum}h` },
                  { label: "Crew Size",    val: `${crewSize} painters` },
                  { label: "Est. Days",    val: `${estDays ?? "—"} working days` },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <div className="text-[9px] text-provision-teal/70 uppercase tracking-wide font-bold">{label}</div>
                    <div className="font-display font-black text-provision-navy text-sm">{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Material Budget */}
          <div>
            <label className="section-label flex items-center gap-1.5 mb-2">
              <DollarSign className="w-3.5 h-3.5" /> Material Budget
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-provision-gray-muted text-sm">$</span>
              <input
                type="number"
                min="0"
                step="100"
                value={materialBudget}
                onChange={e => setMaterialBudget(e.target.value)}
                placeholder="e.g. 2500"
                className="w-full border border-provision-gray-border rounded-lg pl-6 pr-3 py-2.5 text-sm text-provision-navy focus:ring-2 focus:ring-provision-teal outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="section-label mb-2 block">Notes for PM / Crew</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Color details, access instructions, special materials, customer notes…"
              className="w-full border border-provision-gray-border rounded-lg px-3 py-2.5 text-sm text-provision-navy focus:ring-2 focus:ring-provision-teal outline-none resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="border-t border-provision-gray-mid px-6 py-4 flex gap-3 flex-shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1"
            disabled={saving}
          >
            Cancel
          </button>
          {done ? (
            <div className="btn-teal flex-1 justify-center pointer-events-none">
              <CheckCircle className="w-4 h-4" />
              Scheduled!
            </div>
          ) : (
            <button
              onClick={handleSubmit as never}
              disabled={saving || !crewName || !startDate || !endDate}
              className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Scheduling…</>
              ) : (
                <>Schedule Job →</>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
