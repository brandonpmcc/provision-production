export const dynamic = "force-dynamic";

import Link from "next/link";
import { getCrews, getActivePipelineJobs } from "@/lib/airtable";
import { CONTRACTOR_LOGINS } from "@/lib/contractor-auth";
import { HardHat, ExternalLink, Shield, Search } from "lucide-react";

// Color map matching Airtable crew colors
const COLOR_MAP: Record<string, string> = {
  Teal: "#14B8A6", Green: "#22C55E", Yellow: "#EAB308", Purple: "#9333EA",
  Pink: "#EC4899", Thistle: "#A855F7", "Sky Blue": "#38BDF8", "Dark Blue": "#1E3A8A",
  Salmon: "#FB923C", Mint: "#22C55E", Orange: "#F57C1F", Periwinkle: "#818CF8",
  Red: "#DC2626", Buttercream: "#D4A017", Gold: "#CA8A04", "Light Blue": "#93C5FD",
  Turquoise: "#06B6D4", Gray: "#9CA3AF", Seafoam: "#5EEAD4", Blush: "#F9A8D4",
  Tomato: "#EF4444", Plum: "#7C3AED",
};

export default async function CrewRegistryPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tab = searchParams?.tab === "credentials" ? "credentials" : searchParams?.tab === "active" ? "active" : "registry";

  const [crews, allJobs] = await Promise.all([
    getCrews().catch(() => []),
    getActivePipelineJobs().catch(() => []),
  ]);

  // Count active jobs per crew
  const jobCountByCrew = new Map<string, number>();
  for (const job of allJobs) {
    if (job.crew) jobCountByCrew.set(job.crew, (jobCountByCrew.get(job.crew) ?? 0) + 1);
  }

  // Build enriched crew list
  const crewEntries = Object.entries(CONTRACTOR_LOGINS).sort((a, b) =>
    a[1].crewName.localeCompare(b[1].crewName)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="section-label mb-0.5">Sub Management</div>
          <h1 className="page-header">Subcontractor Registry</h1>
          <p className="text-sm text-provision-gray-text mt-0.5">
            {crewEntries.length} registered crews · Share portal links to give them job access
          </p>
        </div>
        <div className="flex items-center gap-2 card py-2 px-3">
          <Shield className="w-4 h-4 text-provision-teal" />
          <span className="text-xs font-bold text-provision-navy uppercase tracking-wide">Admin View</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-provision-gray rounded-xl p-1 w-fit">
        {[
          { id: "registry", label: "Registry" },
          { id: "active", label: "Active Jobs" },
          { id: "credentials", label: "Credentials & Links" },
        ].map(({ id, label }) => (
          <Link
            key={id}
            href={`/crews?tab=${id}`}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wide transition-all ${
              tab === id
                ? "bg-white text-provision-charcoal shadow-card"
                : "text-provision-gray-text hover:text-provision-charcoal"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* REGISTRY TAB */}
      {tab === "registry" && (
        <div className="grid grid-cols-3 gap-4">
          {crewEntries.map(([email, login]) => {
            const crew = crews.find(c => c.name === login.crewName);
            const color = crew?.color ? (COLOR_MAP[crew.color] ?? "#9CA3AF") : "#9CA3AF";
            const activeJobs = jobCountByCrew.get(login.crewName) ?? 0;

            return (
              <div key={email} className="card hover:shadow-card-hover transition-all group">
                {/* Color bar + name — click to open profile */}
                <Link href={`/crews/${login.token}`} className="flex items-start gap-3 mb-3 hover:opacity-80 transition-opacity">
                  <div
                    className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: color + "22", border: `2px solid ${color}` }}
                  >
                    <HardHat className="w-5 h-5" style={{ color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-black text-provision-navy text-[13px] uppercase tracking-tight leading-tight">
                      {login.crewName}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                        Active
                      </span>
                      {activeJobs > 0 && (
                        <span className="text-[10px] text-provision-gray-text font-semibold">
                          {activeJobs} active job{activeJobs !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Portal link */}
                <a
                  href={`/crew/${login.token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-provision-teal-light text-provision-teal border border-provision-teal/20 rounded-lg py-2 text-xs font-bold uppercase tracking-wide hover:bg-provision-teal hover:text-white transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Portal
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* ACTIVE JOBS TAB */}
      {tab === "active" && (
        <div className="space-y-4">
          {crewEntries.map(([, login]) => {
            const crew = crews.find(c => c.name === login.crewName);
            const crewJobs = allJobs.filter(j => j.crew === login.crewName && j.productionStage !== "Completed");

            if (crewJobs.length === 0) return null;

            const color = crew?.color ? (COLOR_MAP[crew.color] ?? "#9CA3AF") : "#9CA3AF";

            return (
              <div key={login.crewName} className="card">
                {/* Crew header */}
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-provision-gray-mid">
                  <div
                    className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: color + "22", border: `2px solid ${color}` }}
                  >
                    <HardHat className="w-4 h-4" style={{ color }} />
                  </div>
                  <div>
                    <div className="font-display font-black text-provision-navy text-sm uppercase tracking-tight">
                      {login.crewName}
                    </div>
                    <div className="text-xs text-provision-gray-text mt-0.5">
                      {crewJobs.length} active job{crewJobs.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                {/* Jobs list */}
                <div className="space-y-2">
                  {crewJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-2.5 rounded-lg bg-provision-gray/50">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-provision-navy text-sm truncate">{job.name}</div>
                        <div className="text-xs text-provision-gray-text mt-0.5 truncate">{job.address}</div>
                      </div>
                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold ${
                          job.productionStage === "In Progress" ? "bg-green-100 text-green-700" :
                          job.productionStage === "Ready to Start" ? "bg-blue-100 text-blue-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {job.productionStage}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }).filter(Boolean)}
        </div>
      )}

      {/* CREDENTIALS TAB */}
      {tab === "credentials" && (
        <div className="card p-0 overflow-hidden">
          <div className="bg-provision-navy px-4 py-3">
            <p className="text-white/60 text-xs">
              Share the secret link (text/email) or the email + PIN for portal login. Secret links never expire.
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-provision-gray border-b border-provision-gray-mid">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-provision-gray-muted uppercase tracking-widest">Crew</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-provision-gray-muted uppercase tracking-widest">Login Email</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-provision-gray-muted uppercase tracking-widest">PIN</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-provision-gray-muted uppercase tracking-widest">Secret Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-provision-gray-mid">
              {crewEntries.map(([email, login]) => (
                <tr key={email} className="hover:bg-provision-gray transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="font-display font-black text-provision-navy uppercase text-[12px]">{login.crewName}</div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-provision-gray-text font-mono">{email}</td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono font-black text-provision-orange text-lg tracking-widest">{login.pin}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-provision-gray-text font-mono">/crew/{login.token}</span>
                      <a
                        href={`/crew/${login.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-provision-teal hover:underline text-xs font-bold flex-shrink-0"
                      >
                        Open →
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
