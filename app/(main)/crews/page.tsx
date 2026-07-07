import { CONTRACTOR_LOGINS } from "@/lib/contractor-auth";
import { Copy, ExternalLink, Shield } from "lucide-react";

export default function CrewCredentialsPage() {
  const crews = Object.entries(CONTRACTOR_LOGINS).sort((a, b) =>
    a[1].crewName.localeCompare(b[1].crewName)
  );

  const baseUrl = process.env.NEXTAUTH_URL || "https://provision-production.vercel.app";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="section-label mb-0.5">Sub Portal</div>
          <h1 className="page-header">Crew Credentials</h1>
          <p className="text-sm text-provision-gray-text mt-0.5">
            {crews.length} crews · Share secret links or credentials with each sub
          </p>
        </div>
        <div className="card flex items-center gap-2 py-2 px-3">
          <Shield className="w-4 h-4 text-provision-teal" />
          <span className="text-xs font-bold text-provision-navy uppercase tracking-wide">Admin Only</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="card bg-provision-teal-light border-provision-teal/20 border">
        <div className="font-display font-black text-provision-navy text-sm uppercase tracking-wide mb-2">
          How to share with a crew
        </div>
        <div className="text-sm text-provision-charcoal space-y-1">
          <p><strong>Option A (easiest):</strong> Copy the secret link and text/email it to the crew lead. They bookmark it — no login ever needed.</p>
          <p><strong>Option B (login):</strong> Give them the email and PIN. They go to <code className="bg-white/60 px-1 rounded">/contractor-login</code> and sign in.</p>
        </div>
      </div>

      {/* Crew table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-provision-navy">
              <th className="text-left px-4 py-3 text-[11px] font-bold text-white/60 uppercase tracking-widest">Crew Name</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-white/60 uppercase tracking-widest">Login Email</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-white/60 uppercase tracking-widest">PIN</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-white/60 uppercase tracking-widest">Secret Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-provision-gray-mid">
            {crews.map(([email, login]) => {
              const secretUrl = `${baseUrl}/crew/${login.token}`;
              return (
                <tr key={email} className="hover:bg-provision-gray transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-display font-black text-provision-navy uppercase text-[13px]">
                      {login.crewName}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-provision-gray-text font-mono">
                    {email}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-provision-orange text-base tracking-widest">
                      {login.pin}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-provision-gray-text font-mono truncate max-w-[180px]">
                        /crew/{login.token}
                      </span>
                      <a
                        href={`/crew/${login.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-provision-teal hover:text-provision-teal-dark text-xs font-semibold flex-shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-provision-gray-muted">
        Secret links never expire unless regenerated. Only share with the crew lead. The portal shows only that crew's assigned jobs.
      </p>
    </div>
  );
}
