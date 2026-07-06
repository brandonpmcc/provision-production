"use client";

import { useState } from "react";
import type { Crew, CrewHealth, ProductionJob } from "@/lib/types";
import { Star, Briefcase, Clock, ChevronDown, ChevronUp, Phone } from "lucide-react";

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
  "Needs Confirmation":"bg-yellow-100 text-yellow-800",
  "Final Walkthrough": "bg-purple-100 text-purple-800",
};

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const pct = value ? (value / 5) * 100 : 0;
  const color = !value ? "bg-gray-200" : value >= 4.5 ? "bg-green-500" : value >= 3.5 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-provision-gray-text">{label}</span>
        <span className="font-semibold text-provision-charcoal-dark">{value != null ? value.toFixed(1) : "—"}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function HealthBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="pill bg-gray-100 text-gray-500">Not rated</span>;
  if (score >= 4.5) return <span className="pill bg-green-100 text-green-700">Excellent</span>;
  if (score >= 3.5) return <span className="pill bg-yellow-100 text-yellow-700">Good</span>;
  if (score >= 2.5) return <span className="pill bg-orange-100 text-orange-700">Fair</span>;
  return <span className="pill bg-red-100 text-red-700">Needs attention</span>;
}

interface Props {
  crew: Crew;
  health: CrewHealth | undefined;
  activeJobs: ProductionJob[];
}

export function CrewCard({ crew, health, activeJobs }: Props) {
  const [expanded, setExpanded] = useState(false);
  const colorHex = (crew.color && COLOR_MAP[crew.color]) || "#9CA3AF";
  const jobCount = health?.activeJobs || 0;

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-md shrink-0" style={{ backgroundColor: colorHex }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-provision-charcoal-dark truncate">{crew.name}</span>
            {crew.inHouse && <span className="pill bg-provision-orange-light text-provision-orange-dark">In-house</span>}
            <HealthBadge score={health?.avgOverall ?? null} />
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-provision-gray-text">
            <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{jobCount} active</span>
            {health && health.scheduledHours > 0 && (
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{health.scheduledHours}h</span>
            )}
            {health && health.scoredJobs > 0 && (
              <span className="flex items-center gap-1"><Star className="w-3 h-3" />{health.scoredJobs} rated</span>
            )}
          </div>
          {crew.leadContactPhone && (
            <div className="flex items-center gap-1 mt-1 text-xs text-provision-gray-text">
              <Phone className="w-3 h-3" />
              <a href={`tel:${crew.leadContactPhone}`} className="hover:text-provision-orange-dark transition">
                {crew.leadContactPhone}
              </a>
              {crew.leadContactName && <span>({crew.leadContactName})</span>}
            </div>
          )}
        </div>
        {health?.avgOverall != null && (
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-provision-charcoal-dark">{health.avgOverall}</div>
            <div className="text-xs text-provision-gray-text">/ 5.0</div>
          </div>
        )}
      </div>

      {/* Score bars */}
      {health && health.scoredJobs > 0 ? (
        <div className="space-y-2.5">
          <ScoreBar label="On-time & reliability" value={health.avgOnTime} />
          <ScoreBar label="Customer satisfaction" value={health.avgCustomerSat} />
          <ScoreBar label="Communication" value={health.avgCommunication} />
        </div>
      ) : (
        <div className="text-xs text-provision-gray-text italic">
          No ratings yet — scores entered after Final Walkthrough
        </div>
      )}

      {/* Trades */}
      {crew.trades.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-provision-gray-mid">
          {crew.trades.map((t) => (
            <span key={t} className="pill bg-provision-gray text-provision-charcoal">{t}</span>
          ))}
        </div>
      )}

      {/* Expand: active jobs */}
      {activeJobs.length > 0 && (
        <div className="mt-3 pt-3 border-t border-provision-gray-mid">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1.5 text-xs font-semibold text-provision-orange-dark hover:text-provision-orange transition w-full"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? "Hide" : "Show"} {activeJobs.length} active job{activeJobs.length !== 1 ? "s" : ""}
          </button>
          {expanded && (
            <div className="mt-2 space-y-1.5">
              {activeJobs.map((j) => (
                <div key={j.id} className="flex items-center justify-between text-xs py-1.5 border-b border-provision-gray-mid last:border-0">
                  <div>
                    <span className="font-medium text-provision-charcoal-dark">{j.job}</span>
                    {j.startDate && (
                      <span className="text-provision-gray-text ml-2">
                        {j.startDate}{j.endDate ? ` → ${j.endDate}` : ""}
                      </span>
                    )}
                  </div>
                  <span className={`pill text-[10px] ${STAGE_PILL[j.stage || ""] || "bg-gray-100 text-gray-600"}`}>
                    {j.stage}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
