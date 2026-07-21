"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { PipelineJob, Crew, ProductionStage } from "@/lib/types";
import { saveJobEdit, activateAndSaveJob } from "@/app/actions";
import { recommendCrews, recommendPMs } from "@/lib/recommend";
import type { CrewRecommendation, PMRecommendation } from "@/lib/recommend";
import {
  X,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Camera,
  FileText,
  Users,
  Calendar,
  Package,
  Palette,
  Loader2,
  Zap,
  MapPin,
  Briefcase,
  DollarSign,
  Sparkles,
  ChevronDown,
  ChevronUp,
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

const AIRTABLE_PRODUCTION_TABLE = "tblsAq6MisZKzwqEG";
const AIRTABLE_BASE = "appHvFXShVSNjLCrG";

// ── Reusable field components ──────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-3.5 h-3.5 text-provision-orange-dark" />
      <span className="text-xs font-semibold text-provision-charcoal-dark uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-provision-gray-text mb-1">{label}</label>
      {children}
    </div>
  );
}

const INPUT_CLS =
  "w-full border border-provision-gray-mid rounded-md px-3 py-2 text-sm focus:outline-none focus:border-provision-orange focus:ring-1 focus:ring-provision-orange/20";

// ── Recommendation sub-components ──────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75 ? "bg-green-500 text-white"
    : score >= 50 ? "bg-yellow-400 text-yellow-900"
    : "bg-gray-200 text-gray-600";
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color}`}>
      {score}
    </span>
  );
}

function CrewRecCard({
  rec,
  isSelected,
  onAssign,
}: {
  rec: CrewRecommendation;
  isSelected: boolean;
  onAssign: (name: string) => void;
}) {
  const dotColor = CREW_HEX[rec.crew.color ?? ""] ?? "#94a3b8";
  return (
    <div
      className={`rounded-md border p-2.5 transition ${
        isSelected
          ? "border-provision-orange bg-provision-orange-light"
          : "border-provision-gray-mid bg-white hover:border-provision-orange/50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: dotColor }}
          />
          <span className="text-xs font-semibold text-provision-charcoal-dark truncate">
            {rec.crew.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <ScoreBadge score={rec.score} />
          {isSelected ? (
            <span className="text-[10px] text-provision-orange font-semibold">Assigned</span>
          ) : (
            <button
              type="button"
              onClick={() => onAssign(rec.crew.name)}
              className="text-[10px] bg-provision-orange text-white px-2 py-0.5 rounded-full font-semibold hover:bg-provision-orange-dark transition"
            >
              Use
            </button>
          )}
        </div>
      </div>
      {/* Reason chips */}
      <div className="flex flex-wrap gap-1 mt-1.5">
        {rec.reasons.map((r) => (
          <span
            key={r}
            className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full"
          >
            ✓ {r}
          </span>
        ))}
        {rec.warnings.map((w) => (
          <span
            key={w}
            className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full"
          >
            ⚠ {w}
          </span>
        ))}
      </div>
    </div>
  );
}

function PMWorkloadCard({ pm }: { pm: PMRecommendation }) {
  const borderCls = pm.isCurrentPM
    ? "border-provision-orange"
    : pm.isRecommended
    ? "border-green-400"
    : "border-provision-gray-mid";
  const loadColor =
    pm.activeJobCount >= 12 ? "text-red-600"
    : pm.activeJobCount >= 8  ? "text-yellow-600"
    : "text-green-600";

  return (
    <div className={`rounded-md border p-2 text-center ${borderCls}`}>
      <div className="text-xs font-semibold text-provision-charcoal-dark">
        {pm.firstName}
      </div>
      <div className={`text-lg font-bold ${loadColor}`}>
        {pm.activeJobCount}
      </div>
      <div className="text-[10px] text-provision-gray-text leading-tight">
        active jobs
      </div>
      <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
        {pm.isCurrentPM && (
          <span className="text-[9px] bg-provision-orange-light text-provision-orange-dark px-1 rounded font-semibold">
            Current
          </span>
        )}
        {pm.isRecommended && !pm.isCurrentPM && (
          <span className="text-[9px] bg-green-50 text-green-700 px-1 rounded font-semibold">
            Lightest
          </span>
        )}
        {pm.zoneMatch && (
          <span className="text-[9px] bg-blue-50 text-blue-700 px-1 rounded font-semibold">
            In zone
          </span>
        )}
      </div>
    </div>
  );
}

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div
        onClick={() => onChange(!checked)}
        className={`w-5 h-5 rounded flex items-center justify-center border-2 transition ${
          checked
            ? "bg-green-500 border-green-500"
            : "border-provision-gray-mid group-hover:border-provision-orange"
        }`}
      >
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <span
        className={`text-sm ${
          checked ? "text-provision-charcoal-dark font-medium" : "text-provision-gray-text"
        }`}
      >
        {label}
      </span>
    </label>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

/** Airtable color name → hex for crew colour dots */
const CREW_HEX: Record<string, string> = {
  Red: "#ef4444", Salmon: "#fb7185", Pink: "#f472b6", Tangerine: "#fb923c",
  Orange: "#f97316", Yellow: "#eab308", Lime: "#84cc16", Green: "#22c55e",
  Emerald: "#10b981", Teal: "#14b8a6", Cyan: "#06b6d4", Sky: "#38bdf8",
  Blue: "#3b82f6", Indigo: "#6366f1", Periwinkle: "#818cf8", Violet: "#7c3aed",
  Purple: "#a855f7", Thistle: "#d8b4fe", Lavender: "#c4b5fd", Magenta: "#e879f9",
  Rose: "#f43f5e", Gray: "#94a3b8",
};

interface Props {
  job: PipelineJob;
  crews: Crew[];
  /** All active pipeline jobs — needed for workload scoring */
  allJobs: PipelineJob[];
  onClose: () => void;
}

export function JobEditPanel({ job, crews, allJobs, onClose }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state — seeded from current job data
  const [stage, setStage] = useState<string>(job.productionStage || "Pending Schedule");
  const [crew, setCrew] = useState(job.crew || "");
  const [crew2, setCrew2] = useState(job.crew2 || "");
  const [startDate, setStartDate] = useState(job.startDate || "");
  const [endDate, setEndDate] = useState(job.endDate || "");
  const [customerConfirmed, setCustomerConfirmed] = useState(job.customerConfirmedStart);
  const [crewConfirmed, setCrewConfirmed] = useState(job.crewConfirmed);
  const [colorStatus, setColorStatus] = useState(job.colorStatus || "Not Started");
  const [materialStatus, setMaterialStatus] = useState(job.materialStatus || "Not Ordered");
  const [specialMaterials, setSpecialMaterials] = useState(job.specialMaterialsWarning || "");
  const [companyCamUrl, setCompanyCamUrl] = useState(job.companyCamUrl || "");
  const [notes, setNotes] = useState(job.notes || "");

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllCrews, setShowAllCrews] = useState(false);

  // Recommendations — computed once when panel opens
  const crewRecs = useMemo(() => recommendCrews(job, crews, allJobs), [job, crews, allJobs]);
  const pmRecs   = useMemo(() => recommendPMs(job, allJobs),          [job, allJobs]);

  function money(n: number | null | undefined) {
    if (n == null) return "";
    return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }

  const updates = {
    stage: stage || null,
    crew: crew || null,
    crew2: crew2 || null,
    startDate: startDate || null,
    endDate: endDate || null,
    customerConfirmedStart: customerConfirmed,
    crewConfirmed: crewConfirmed,
    colorStatus: colorStatus || null,
    materialStatus: materialStatus || null,
    specialMaterialsWarning: specialMaterials || null,
    companyCamUrl: companyCamUrl || null,
    notes: notes || null,
  };

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        if (job.isActivated) {
          // Update existing Production record
          await saveJobEdit(job.id, updates);
        } else {
          // Create a new Production record and link it to the Deal
          await activateAndSaveJob(job.name, job.dealId, updates);
        }
        setSaved(true);
        router.refresh();
        setTimeout(() => {
          onClose();
        }, 600);
      } catch (e) {
        console.error(e);
        setError("Save failed. Check your connection and try again.");
      }
    });
  }

  // Airtable direct link — to Production record if activated, else to the Deal
  const airtableUrl = job.isActivated
    ? `https://airtable.com/${AIRTABLE_BASE}/${AIRTABLE_PRODUCTION_TABLE}/${job.id}`
    : job.dealId
    ? `https://airtable.com/${AIRTABLE_BASE}/tblUhWSbH6r1nAC1h/${job.dealId}`
    : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-[480px] max-w-full bg-white z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-provision-charcoal px-5 py-4 flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-white text-base truncate">{job.name}</h2>
              {!job.isActivated && (
                <span
                  className="flex items-center gap-1 text-[10px] bg-provision-orange/20 text-provision-orange px-1.5 py-0.5 rounded font-semibold shrink-0"
                  title="From DripJobs — saving will create a Production record"
                >
                  <Zap className="w-2.5 h-2.5" /> New
                </span>
              )}
            </div>
            <p className="text-xs text-white/60 mt-0.5 truncate">
              {job.address}
              {job.value ? ` · ${money(job.value)}` : ""}
              {job.pmName ? ` · ${job.pmName}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-3 shrink-0">
            {airtableUrl && (
              <a
                href={airtableUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="View in Airtable"
                className="p-1.5 rounded text-white/50 hover:text-white hover:bg-white/10 transition"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded text-white/50 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Deal Info — read-only summary from Airtable Deals */}
          <section className="bg-provision-gray rounded-lg p-3 space-y-1.5">
            <div className="text-[10px] font-semibold text-provision-gray-text uppercase tracking-wide mb-2">
              Deal Info
            </div>
            {job.address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-3.5 h-3.5 text-provision-gray-text shrink-0 mt-0.5" />
                <span className="text-provision-charcoal-dark">
                  {job.address}
                  {job.city || job.state || job.zip
                    ? `, ${[job.city, job.state, job.zip].filter(Boolean).join(", ")}`
                    : ""}
                </span>
              </div>
            )}
            {job.projectType && (
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="w-3.5 h-3.5 text-provision-gray-text shrink-0" />
                <span className="text-provision-charcoal-dark">{job.projectType}</span>
              </div>
            )}
            {job.value != null && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-3.5 h-3.5 text-provision-gray-text shrink-0" />
                <span className="text-provision-charcoal-dark font-medium">{money(job.value)}</span>
                {job.estimatedHours && (
                  <span className="text-provision-gray-text">· {job.estimatedHours}h est.</span>
                )}
              </div>
            )}
            {job.pmName && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-3.5 h-3.5 text-provision-gray-text shrink-0" />
                <span className="text-provision-charcoal-dark">{job.pmName}</span>
              </div>
            )}
            {/* Customer contact info */}
            {job.customerPhone && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-provision-gray-text text-xs shrink-0">📞</span>
                <a href={`tel:${job.customerPhone}`} className="text-provision-teal font-medium hover:underline">
                  {job.customerPhone}
                </a>
              </div>
            )}
            {job.customerEmail && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-provision-gray-text text-xs shrink-0">✉</span>
                <a href={`mailto:${job.customerEmail}`} className="text-provision-teal hover:underline truncate">
                  {job.customerEmail}
                </a>
              </div>
            )}
            {/* Budget breakdown */}
            {(job.estimatedLaborCost || job.estimatedMaterials) && (
              <div className="flex items-center gap-4 text-xs text-provision-gray-text pt-1 border-t border-provision-gray-mid mt-1">
                {job.estimatedLaborCost && <span>Labor: <strong className="text-provision-charcoal">{money(job.estimatedLaborCost)}</strong></span>}
                {job.estimatedMaterials && <span>Materials: <strong className="text-provision-charcoal">{money(job.estimatedMaterials)}</strong></span>}
              </div>
            )}
          </section>

          {/* Pipeline Stage */}
          <section>
            <SectionHeader icon={CheckCircle} label="Pipeline Stage" />
            <div className="grid grid-cols-3 gap-1.5">
              {STAGES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStage(s)}
                  className={`px-2 py-1.5 rounded-md text-xs font-medium border transition text-left ${
                    stage === s
                      ? "bg-provision-orange text-white border-provision-orange"
                      : "bg-white text-provision-charcoal border-provision-gray-mid hover:border-provision-orange"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          {/* Schedule */}
          <section>
            <SectionHeader icon={Calendar} label="Schedule" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={INPUT_CLS}
                />
              </Field>
              <Field label="End date">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={INPUT_CLS}
                />
              </Field>
            </div>
          </section>

          {/* Team */}
          <section>
            <SectionHeader icon={Users} label="Team" />
            <div className="space-y-4">

              {/* ── Crew Recommendations ─────────────────────────────── */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-provision-orange" />
                  <span className="text-xs font-semibold text-provision-charcoal-dark">
                    Recommended Crews
                  </span>
                  {job.zip && (
                    <span className="text-[10px] text-provision-gray-text ml-auto">
                      for {job.zip}
                      {job.projectType ? ` · ${job.projectType}` : ""}
                    </span>
                  )}
                </div>
                {crewRecs.length === 0 ? (
                  <p className="text-xs text-provision-gray-text italic">
                    No crews match — check trades/coverage in Airtable.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {crewRecs.map((rec) => (
                      <CrewRecCard
                        key={rec.crew.id}
                        rec={rec}
                        isSelected={crew === rec.crew.name}
                        onAssign={(name) => setCrew(name)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* ── Manual crew dropdowns ─────────────────────────────── */}
              <button
                type="button"
                onClick={() => setShowAllCrews((v) => !v)}
                className="flex items-center gap-1 text-xs text-provision-gray-text hover:text-provision-charcoal transition"
              >
                {showAllCrews ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showAllCrews ? "Hide" : "Show"} all {crews.length} crews
              </button>

              {showAllCrews && (
                <div className="space-y-3">
                  <Field label="Crew">
                    <select
                      value={crew}
                      onChange={(e) => setCrew(e.target.value)}
                      className={INPUT_CLS}
                    >
                      <option value="">— Not assigned —</option>
                      {crews.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Crew 2 (split job)">
                    <select
                      value={crew2}
                      onChange={(e) => setCrew2(e.target.value)}
                      className={INPUT_CLS}
                    >
                      <option value="">— None —</option>
                      {crews.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              {/* Currently selected crew display */}
              {crew && (
                <div className="flex items-center justify-between text-xs bg-provision-gray rounded-md px-3 py-2">
                  <span className="text-provision-charcoal-dark font-medium">{crew}</span>
                  <button
                    type="button"
                    onClick={() => setCrew("")}
                    className="text-provision-gray-text hover:text-red-500 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* ── PM Workload ──────────────────────────────────────── */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-provision-orange" />
                  <span className="text-xs font-semibold text-provision-charcoal-dark">
                    PM Workload
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {pmRecs.map((pm) => (
                    <PMWorkloadCard key={pm.recordId} pm={pm} />
                  ))}
                </div>
                <p className="text-[10px] text-provision-gray-text mt-1.5">
                  Active job counts across Pending → Final Walkthrough stages.
                </p>
              </div>

            </div>
          </section>

          {/* Confirmations */}
          <section>
            <SectionHeader icon={CheckCircle} label="Confirmations" />
            <div className="space-y-3">
              <CheckField
                label="Customer confirmed start date"
                checked={customerConfirmed}
                onChange={setCustomerConfirmed}
              />
              <CheckField
                label="Crew confirmed start date"
                checked={crewConfirmed}
                onChange={setCrewConfirmed}
              />
            </div>
          </section>

          {/* Colors */}
          <section>
            <SectionHeader icon={Palette} label="Color Selection" />
            <div className="flex gap-2">
              {(["Not Started", "In Progress", "Complete"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setColorStatus(s)}
                  className={`flex-1 py-2 rounded-md text-xs font-medium border transition ${
                    colorStatus === s
                      ? s === "Complete"
                        ? "bg-green-500 text-white border-green-500"
                        : s === "In Progress"
                        ? "bg-yellow-400 text-yellow-900 border-yellow-400"
                        : "bg-gray-200 text-gray-700 border-gray-300"
                      : "bg-white text-provision-gray-text border-provision-gray-mid hover:border-provision-orange"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          {/* Materials */}
          <section>
            <SectionHeader icon={Package} label="Materials" />
            <div className="space-y-3">
              <div className="flex gap-2">
                {(["Not Ordered", "Ordered", "Received", "Backordered"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setMaterialStatus(s)}
                    className={`flex-1 py-2 rounded-md text-xs font-medium border transition leading-tight text-center ${
                      materialStatus === s
                        ? s === "Received"
                          ? "bg-green-500 text-white border-green-500"
                          : s === "Backordered"
                          ? "bg-red-500 text-white border-red-500"
                          : s === "Ordered"
                          ? "bg-yellow-400 text-yellow-900 border-yellow-400"
                          : "bg-gray-200 text-gray-700 border-gray-300"
                        : "bg-white text-provision-gray-text border-provision-gray-mid hover:border-provision-orange"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <Field label="Special materials warning">
                <div className="relative">
                  {specialMaterials && (
                    <AlertTriangle className="absolute left-3 top-2.5 w-3.5 h-3.5 text-orange-500" />
                  )}
                  <textarea
                    value={specialMaterials}
                    onChange={(e) => setSpecialMaterials(e.target.value)}
                    rows={2}
                    placeholder="Any special-order or unusual materials…"
                    className={`${INPUT_CLS} resize-none ${specialMaterials ? "pl-8" : ""}`}
                  />
                </div>
              </Field>
            </div>
          </section>

          {/* CompanyCam */}
          <section>
            <SectionHeader icon={Camera} label="CompanyCam" />
            <div className="flex gap-2">
              <input
                type="url"
                value={companyCamUrl}
                onChange={(e) => setCompanyCamUrl(e.target.value)}
                placeholder="https://app.companycam.com/projects/…"
                className={`${INPUT_CLS} flex-1`}
              />
              {companyCamUrl && (
                <a
                  href={companyCamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 border border-provision-gray-mid rounded-md hover:border-provision-orange transition flex items-center"
                >
                  <ExternalLink className="w-4 h-4 text-provision-gray-text" />
                </a>
              )}
            </div>
          </section>

          {/* Notes */}
          <section>
            <SectionHeader icon={FileText} label="Notes" />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Internal notes for the team…"
              className={`${INPUT_CLS} resize-none`}
            />
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-provision-gray-mid bg-white flex items-center justify-between gap-3">
          {error ? (
            <p className="text-xs text-red-600 flex-1">{error}</p>
          ) : (
            <div className="text-xs text-provision-gray-text">
              {!job.isActivated && (
                <span className="flex items-center gap-1 text-provision-orange-dark font-medium">
                  <Zap className="w-3 h-3" /> Saving will create a production record
                </span>
              )}
              {job.isActivated && airtableUrl && (
                <a
                  href={airtableUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-provision-orange-dark flex items-center gap-1 transition"
                >
                  <ExternalLink className="w-3 h-3" /> View in Airtable
                </a>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-md border border-provision-gray-mid text-sm text-provision-charcoal hover:bg-provision-gray transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending || saved}
              className={`px-5 py-2 rounded-md text-sm font-semibold transition flex items-center gap-2 ${
                saved
                  ? "bg-green-500 text-white"
                  : "bg-provision-orange text-white hover:bg-provision-orange-dark"
              } disabled:opacity-70`}
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saved ? "Saved!" : isPending ? "Saving…" : job.isActivated ? "Save changes" : "Activate job"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
