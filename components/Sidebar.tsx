"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarRange,
  Kanban,
  Map,
  Users,
  Settings,
  LogOut,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  matchPrefix?: string;
}

const NAV_ALL: NavItem[] = [
  { href: "/",         label: "Dashboard", icon: LayoutDashboard },
  { href: "/schedule", label: "Schedule",  icon: CalendarRange,  matchPrefix: "/schedule" },
  { href: "/pipeline", label: "Pipeline",  icon: Kanban,         matchPrefix: "/pipeline" },
  { href: "/map",      label: "Map",       icon: Map,            matchPrefix: "/map" },
  { href: "/team",     label: "Team",      icon: Users,          matchPrefix: "/team" },
  { href: "/settings", label: "Settings",  icon: Settings,       matchPrefix: "/settings" },
];

const NAV_PM: NavItem[] = [
  { href: "/",         label: "Dashboard", icon: LayoutDashboard },
  { href: "/schedule", label: "Schedule",  icon: CalendarRange,  matchPrefix: "/schedule" },
  { href: "/pipeline", label: "Pipeline",  icon: Kanban,         matchPrefix: "/pipeline" },
];

function initials(name?: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const email = user?.email ?? "";

  const isCoordinator =
    email === "miriam@provisionpaints.com" ||
    email === "jacob@provisionpaints.com";
  const nav = isCoordinator ? NAV_ALL : NAV_PM;

  function isActive(item: NavItem) {
    if (item.href === "/") return pathname === "/";
    return pathname.startsWith(item.matchPrefix ?? item.href);
  }

  return (
    <aside className="w-56 bg-provision-charcoal text-white flex-shrink-0 flex flex-col select-none">

      {/* ── Brand header ─────────────────────────── */}
      <div className="px-4 pt-5 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
            <Image
              src="/pvp-icon.svg"
              alt="ProVision"
              width={36}
              height={36}
              className="object-contain"
              unoptimized
            />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-[13px] leading-tight text-white tracking-wide">
              Pro-Vision
            </div>
            <div className="text-[10px] text-white/40 leading-tight uppercase tracking-widest font-medium">
              Production
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────── */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {nav.map((item) => {
          const { href, label, icon: Icon } = item;
          const active = isActive(item);
          return (
            <Link
              key={href}
              href={href}
              className={`
                group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-100
                ${active
                  ? "bg-white/10 text-white"
                  : "text-white/55 hover:text-white hover:bg-white/[0.06]"
                }
              `}
            >
              <Icon
                className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${
                  active ? "text-provision-orange" : "text-white/40 group-hover:text-white/70"
                }`}
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span className="flex-1 truncate">{label}</span>
              {active && (
                <ChevronRight className="w-3 h-3 text-white/25 flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── User footer ──────────────────────────── */}
      <div className="px-3 py-3 border-t border-white/[0.08] space-y-0.5">
        {user && (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name || "User"}
                className="w-7 h-7 rounded-full ring-1 ring-white/20 flex-shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-provision-orange flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                {initials(user.name)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-white/90 truncate leading-tight">
                {user.name?.split(" ")[0] || user.email?.split("@")[0]}
              </div>
              <div className="text-[10px] text-white/35 truncate leading-tight">
                {user.email}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-white/35 hover:text-white/70 hover:bg-white/[0.06] transition text-xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
