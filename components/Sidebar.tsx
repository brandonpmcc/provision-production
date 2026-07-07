"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Clock,
  Kanban,
  CalendarRange,
  Map,
  BarChart2,
  Globe,
  Users,
  Star,
  Package,
  Bell,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  matchPrefix?: string;
  group?: string;
}

const NAV_ALL: NavItem[] = [
  // Core
  { href: "/",                 label: "Dashboard",      icon: LayoutDashboard },
  { href: "/pending-schedule", label: "Pending Queue",  icon: Clock,         matchPrefix: "/pending-schedule", group: "Schedule" },
  { href: "/pipeline",         label: "Pipeline",       icon: Kanban,        matchPrefix: "/pipeline",         group: "Schedule" },
  { href: "/schedule",         label: "Calendar",       icon: CalendarRange, matchPrefix: "/schedule",         group: "Schedule" },
  // Geographic
  { href: "/map",              label: "Map",            icon: Map,           matchPrefix: "/map",              group: "Jobs" },
  { href: "/territories",      label: "Territories",    icon: Globe,         matchPrefix: "/territories",      group: "Jobs" },
  // Team
  { href: "/team",             label: "Team",           icon: Users,         matchPrefix: "/team",             group: "Team" },
  { href: "/crews",            label: "Crew Health",    icon: Star,          matchPrefix: "/crews",            group: "Team" },
  { href: "/capacity",         label: "Capacity",       icon: BarChart2,     matchPrefix: "/capacity",         group: "Team" },
  // Operations
  { href: "/materials",        label: "Materials",      icon: Package,       matchPrefix: "/materials",        group: "Ops" },
  { href: "/reminders",        label: "Reminders",      icon: Bell,          matchPrefix: "/reminders",        group: "Ops" },
  { href: "/settings",         label: "Settings",       icon: Settings,      matchPrefix: "/settings" },
];

const NAV_PM: NavItem[] = [
  { href: "/",                 label: "Dashboard",      icon: LayoutDashboard },
  { href: "/pending-schedule", label: "Pending Queue",  icon: Clock,         matchPrefix: "/pending-schedule" },
  { href: "/pipeline",         label: "Pipeline",       icon: Kanban,        matchPrefix: "/pipeline" },
  { href: "/schedule",         label: "Calendar",       icon: CalendarRange, matchPrefix: "/schedule" },
  { href: "/reminders",        label: "Reminders",      icon: Bell,          matchPrefix: "/reminders" },
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

      {/* ── Teal accent top bar — matches website's teal accent ─── */}
      <div className="h-1 bg-provision-teal flex-shrink-0" />

      {/* ── Brand header ────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3.5 border-b border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          {/* Logo icon with dark bg */}
          <div className="w-10 h-10 rounded-lg bg-provision-navy flex items-center justify-center flex-shrink-0 overflow-hidden">
            <Image
              src="/pvp-icon.svg"
              alt="Pro-Vision"
              width={34}
              height={34}
              className="object-contain"
              unoptimized
            />
          </div>
          <div className="min-w-0">
            <div className="font-display font-black text-[15px] leading-tight text-white uppercase tracking-wide">
              Pro-Vision
            </div>
            <div className="text-[10px] text-provision-teal leading-tight uppercase tracking-widest font-semibold">
              Production
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation ──────────────────────────────────────────── */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto">
        {nav.map((item, i) => {
          const { href, label, icon: Icon, group } = item;
          const active = isActive(item);
          // Show group label when this item starts a new group
          const prevGroup = i > 0 ? nav[i - 1].group : undefined;
          const showGroupLabel = group && group !== prevGroup;
          return (
            <div key={href}>
              {showGroupLabel && (
                <div className="px-3 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest text-white/20">
                  {group}
                </div>
              )}
            <Link
              href={href}
              className={`
                group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all duration-100 mb-0.5
                ${active
                  ? "bg-white/[0.08] text-white"
                  : "text-white/50 hover:text-white hover:bg-white/[0.05]"
                }
              `}
            >
              {/* Active indicator — orange left bar */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-provision-orange rounded-r-full" />
              )}
              <Icon
                className={`w-4 h-4 flex-shrink-0 ml-0.5 transition-colors ${
                  active ? "text-provision-orange" : "text-white/35 group-hover:text-white/60"
                }`}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className="flex-1 truncate uppercase tracking-wide text-[11px]">{label}</span>
            </Link>
            </div>
          );
        })}
      </nav>

      {/* ── User footer ─────────────────────────────────────────── */}
      <div className="px-3 py-3 border-t border-white/[0.07]">
        {user && (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg mb-1">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name || "User"}
                className="w-7 h-7 rounded-full ring-1 ring-provision-teal/40 flex-shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-provision-orange flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 uppercase">
                {initials(user.name)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-bold text-white/90 truncate leading-tight uppercase tracking-wide">
                {user.name?.split(" ")[0] || user.email?.split("@")[0]}
              </div>
              <div className="text-[10px] text-white/30 truncate leading-tight">
                {user.email}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition text-[11px] font-semibold uppercase tracking-wide"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
