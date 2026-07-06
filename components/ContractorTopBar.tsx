"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function ContractorTopBar({ crewName }: { crewName?: string }) {
  return (
    <header className="bg-white border-b border-provision-gray-mid px-6 py-4 flex items-center justify-between">
      <div className="flex-1">
        <h2 className="text-lg font-semibold text-provision-charcoal-dark">
          Welcome, {crewName}
        </h2>
        <p className="text-xs text-provision-gray-text">Manage your crew's jobs and compliance</p>
      </div>

      <button
        onClick={() => signOut({ callbackUrl: "/contractor-login" })}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-provision-gray-text hover:text-provision-charcoal hover:bg-provision-gray transition"
        title="Sign out"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>
    </header>
  );
}
