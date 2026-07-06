"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare, Calendar, FileText } from "lucide-react";

export function ContractorSidebar({ crewName }: { crewName?: string }) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const navItems = [
    { href: "/contractor", label: "My Jobs", icon: CheckSquare },
    { href: "/contractor/schedule", label: "Schedule", icon: Calendar },
    { href: "/contractor/documents", label: "Documents", icon: FileText },
  ];

  return (
    <aside className="w-64 bg-provision-charcoal text-white flex flex-col h-screen shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-provision-orange flex items-center justify-center font-bold text-lg">
            P
          </div>
          <div>
            <div className="text-xs text-white/60 uppercase tracking-wider">Crew Portal</div>
            <div className="text-sm font-semibold">ProVision</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              isActive(href)
                ? "bg-provision-orange text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Footer - Crew Info */}
      <div className="p-6 border-t border-white/10">
        <div className="text-xs text-white/60 mb-2">Crew</div>
        <div className="text-sm font-semibold text-white truncate">{crewName || "Loading..."}</div>
      </div>
    </aside>
  );
}
