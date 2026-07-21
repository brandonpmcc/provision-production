export const dynamic = "force-dynamic";

import Link from "next/link";
import { getProductionJobs, getDJActiveJobs, getPeople } from "@/lib/airtable";
import type { ProductionStage } from "@/lib/types";
import {
  CheckCircle2, XCircle, Package, Bell, AlertTriangle, Settings2,
  ExternalLink, Clock, Users,
} from "lucide-react";

const ACTIVE_STAGES: ProductionStage[] = [
  "Scheduled", "Materials Needed", "Ready to Start", "In Progress",
  "Needs Confirmation", "Final Walkthrough",
];

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

function money(n: number | null | undefined) {
  if (!n) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// ─── Sub-sections ─────────────────────────────────────────────────────────

function IntegrationStatus() {
  const env = {
    "Airtable API":    !!process.env.AIRTABLE_TOKEN,
    "CompanyCam API":  !!process.env.COMPANYCAM_TOKEN,
    "Google OAuth":    !!process.env.GOOGLE_CLIENT_ID,
    "NextAuth Secret": !!process.env.NEXTAUTH_SECRET,
  };
  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Settings2 className="w-4 h-4 text-provision-gray-text" />
        <h2 className="font-semibold text-provision-navy text-sm">Integration Status</h2>
      </div>
      <div className="divide-y divide-provision-gray-mid">
        {Object.entries(env).map(([k, ok]) => (
          <div key={k} className="flex items-center justify-between py-2.5 text-sm">
            <span className="text-provision-charcoal">{k}</span>
            <span className={`flex items-center gap-1 text-xs font-semibold ${ok ? "text-green-600" : "text-red-500"}`}>
              {ok
                ? <><CheckCircle2 className="w-3.5 h-3.5" /> Connected</>
                : <><XCircle className="w-3.5 h-3.5" /> Missing</>
              }
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: { section?: string };
}) {
  const section = searchParams?.section ?? "users";

  // Load materials data and team members
  const [prodJobs, djJobs, people] = await Promise.all([
    getProductionJobs().catch(() => []),
    getDJActiveJobs().catch(() => []),
    getPeople().catch(() => []),
  ]);

  const activeJobs = prodJobs.filter(j => ACTIVE_STAGES.includes(j.stage as ProductionStage));

  const urgent = activeJobs
    .filter(j => {
      const d = daysUntil(j.startDate);
      return d != null && d <= 7 && d >= -1 && j.materialStatus !== "Received";
    })
    .sort((a, b) => (daysUntil(a.startDate) ?? 99) - (daysUntil(b.startDate) ?? 99));

  const warnings = activeJobs.filter(j => j.specialMaterialsWarning);

  const buckets = {
    "Not Ordered": activeJobs.filter(j => !j.materialStatus || j.materialStatus === "Not Ordered"),
    "Ordered":     activeJobs.filter(j => j.materialStatus === "Ordered"),
    "Received":    activeJobs.filter(j => j.materialStatus === "Received"),
    "Backordered": activeJobs.filter(j => j.materialStatus === "Backordered"),
  };

  const tabs = [
    { id: "users",        label: "Users",         icon: <Users className="w-4 h-4" /> },
    { id: "integrations", label: "Integrations",  icon: <Settings2 className="w-4 h-4" /> },
    { id: "materials",    label: "Materials",     icon: <Package className="w-4 h-4" />, badge: urgent.length || undefined },
    { id: "reminders",    label: "Reminders",     icon: <Bell className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="page-header">Settings</h1>
        <p className="text-sm text-provision-gray-text mt-0.5">Integrations, materials &amp; reminders</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-provision-gray rounded-xl p-1 w-fit">
        {tabs.map(({ id, label, icon, badge }) => (
          <Link
            key={id}
            href={`/settings?section=${id}`}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all relative ${
              section === id
                ? "bg-white text-provision-charcoal shadow-card"
                : "text-provision-gray-text hover:text-provision-charcoal"
            }`}
          >
            {icon}
            {label}
            {badge != null && badge > 0 && (
              <span className="ml-0.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {badge}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* ── Users ────────────────────────────────────────────────────── */}
      {section === "users" && (
        <div className="space-y-5">
          {/* Team members list */}
          <div className="space-y-3">
            <h3 className="font-display font-black text-sm text-provision-navy uppercase tracking-wide">Team Members</h3>
            {people.length === 0 ? (
              <div className="card text-center py-8 text-provision-gray-text text-sm">
                <Users className="w-8 h-8 mx-auto mb-2 text-provision-gray-muted" />
                No team members found
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {people.map((person) => (
                  <div key={person.id} className="card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-provision-orange flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                        {person.name ? person.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-provision-navy text-sm">{person.name || "Unnamed"}</div>
                        <div className="text-xs text-provision-gray-text truncate">{person.email || "no email"}</div>
                      </div>
                    </div>
                    {person.role && (
                      <span className="ml-2 flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-provision-teal/10 text-provision-teal uppercase tracking-wide">
                        {person.role}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subcontractor access card */}
          <div className="card border-l-4 border-provision-orange">
            <h3 className="font-display font-black text-sm text-provision-navy uppercase tracking-wide mb-2">Subcontractor Access</h3>
            <p className="text-sm text-provision-gray-text mb-3">
              Manage crew portal access and credentials in the Crews section.
            </p>
            <Link href="/crews?tab=credentials" className="text-xs font-bold text-provision-orange hover:underline">
              Go to Crew Management →
            </Link>
          </div>
        </div>
      )}

      {/* ── Integrations ────────────────────────────────────────────── */}
      {section === "integrations" && (
        <div className="max-w-lg">
          <IntegrationStatus />
          <div className="card mt-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <ExternalLink className="w-4 h-4 text-provision-gray-text" />
              <h2 className="font-semibold text-provision-navy text-sm">Quick Links</h2>
            </div>
            {[
              { label: "Airtable Base",    href: "https://airtable.com" },
              { label: "CompanyCam",       href: "https://companycam.com" },
              { label: "Vercel Dashboard", href: "https://vercel.com/dashboard" },
            ].map(({ label, href }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between py-2 text-sm text-provision-charcoal hover:text-provision-orange transition group">
                <span>{label}</span>
                <ExternalLink className="w-3.5 h-3.5 text-provision-gray-muted group-hover:text-provision-orange transition" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Materials ────────────────────────────────────────────────── */}
      {section === "materials" && (
        <div className="space-y-5">
          {/* Status buckets */}
          <div className="grid grid-cols-4 gap-4">
            {Object.entries(buckets).map(([status, list]) => {
              const color =
                status === "Backordered" ? "text-red-600 bg-red-50" :
                status === "Not Ordered" ? "text-orange-600 bg-orange-50" :
                status === "Ordered"     ? "text-blue-600 bg-blue-50" :
                "text-green-600 bg-green-50";
              return (
                <div key={status} className="card text-center">
                  <div className={`text-2xl font-bold mb-0.5 ${color.split(" ")[0]}`}>{list.length}</div>
                  <div className="text-xs text-provision-gray-text">{status}</div>
                </div>
              );
            })}
          </div>

          {/* Urgent: starting soon */}
          {urgent.length > 0 && (
            <div className="card border-l-4 border-red-500">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-red-500" />
                <h3 className="font-semibold text-provision-navy text-sm">Starting soon — materials not received</h3>
              </div>
              <div className="space-y-2">
                {urgent.map(j => {
                  const d = daysUntil(j.startDate);
                  return (
                    <div key={j.id} className="flex items-center justify-between py-2 border-b border-provision-gray-mid last:border-0 text-sm">
                      <div>
                        <div className="font-medium text-provision-navy">{j.job}</div>
                        <div className="text-xs text-provision-gray-text">{j.crew || "No crew"} · {j.materialStatus || "Not Ordered"}</div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <span className={`text-xs font-semibold ${d != null && d <= 2 ? "text-red-600" : "text-orange-600"}`}>
                          {d === 0 ? "Today" : d === 1 ? "Tomorrow" : d != null && d < 0 ? "Overdue" : `${d}d`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Special warnings */}
          {warnings.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <h3 className="font-semibold text-provision-navy text-sm">Special material warnings</h3>
              </div>
              <div className="space-y-2">
                {warnings.map(j => (
                  <div key={j.id} className="flex items-start gap-2 py-2 border-b border-provision-gray-mid last:border-0 text-sm">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-provision-navy">{j.job}</div>
                      <div className="text-xs text-provision-gray-text">{j.specialMaterialsWarning}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {urgent.length === 0 && warnings.length === 0 && (
            <div className="card text-center py-8 text-provision-gray-text text-sm">
              <Package className="w-8 h-8 mx-auto mb-2 text-provision-gray-muted" />
              No urgent material issues
            </div>
          )}
        </div>
      )}

      {/* ── Reminders ────────────────────────────────────────────────── */}
      {section === "reminders" && (
        <div className="card text-center py-10">
          <Bell className="w-10 h-10 mx-auto mb-3 text-provision-gray-muted" />
          <div className="font-semibold text-provision-navy">Reminders</div>
          <p className="text-sm text-provision-gray-text mt-1 max-w-xs mx-auto">
            Customer confirmation and start-date reminder workflows.
          </p>
          <Link href="/reminders" className="btn-primary mt-4 inline-flex">
            Open Full Reminders Page
          </Link>
        </div>
      )}
    </div>
  );
}
