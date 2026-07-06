import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions, roleFor } from "@/lib/auth";
import { SignOutButton } from "./SignOutButton";
import {
  LayoutDashboard,
  Kanban,
  Calendar,
  Map,
  Package,
  Bell,
  Settings,
  BarChart2,
  Star,
} from "lucide-react";

const NAV_ALL = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/capacity", label: "Capacity", icon: BarChart2 },
  { href: "/crews", label: "Crew Health", icon: Star },
  { href: "/map", label: "Map", icon: Map },
  { href: "/materials", label: "Materials", icon: Package },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

// PMs only see the operational views relevant to their work
const NAV_PM = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/reminders", label: "Reminders", icon: Bell },
];

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export async function Sidebar() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const role = roleFor(user?.email);
  const nav = role === "pm" ? NAV_PM : NAV_ALL;
  const userInitials = initials(user?.name);

  return (
    <aside className="w-60 bg-provision-charcoal text-white flex-shrink-0 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-provision-orange flex items-center justify-center font-bold text-white text-sm">
            PV
          </div>
          <div>
            <div className="font-semibold text-sm leading-tight">ProVision</div>
            <div className="text-xs text-white/60 leading-tight">Production</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-white/5 text-white/80 hover:text-white transition"
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-white/10">
        {user && (
          <div className="flex items-center gap-2.5 px-1 mb-2">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name || "User"}
                className="w-7 h-7 rounded-full shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-provision-orange-light text-provision-orange-dark flex items-center justify-center text-xs font-semibold shrink-0">
                {userInitials}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-medium text-white/90 truncate">
                {user.name || user.email}
              </div>
              <div className="text-[10px] text-white/40 truncate">{user.email}</div>
            </div>
          </div>
        )}
        <SignOutButton />
      </div>
    </aside>
  );
}
