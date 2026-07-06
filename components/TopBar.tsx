import { getServerSession } from "next-auth";
import { authOptions, roleFor } from "@/lib/auth";
import { Search, Bell } from "lucide-react";

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const ROLE_LABEL: Record<string, string> = {
  coordinator: "Production Coordinator",
  manager: "Production Manager",
  pm: "Project Manager",
};

export async function TopBar() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const role = roleFor(user?.email);
  const roleLabel = ROLE_LABEL[role] || "";
  const userInitials = initials(user?.name);

  return (
    <header className="h-14 bg-white border-b border-provision-gray-mid flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <Search className="w-4 h-4 text-provision-gray-text" />
        <input
          type="search"
          placeholder="Search jobs, customers, addresses…"
          className="bg-transparent text-sm outline-none w-80"
        />
      </div>
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-md hover:bg-provision-gray transition relative">
          <Bell className="w-4 h-4 text-provision-charcoal" />
        </button>
        {user && (
          <div className="flex items-center gap-2.5">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name || "User"}
                className="w-8 h-8 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-provision-orange-light text-provision-orange-dark flex items-center justify-center text-xs font-semibold">
                {userInitials}
              </div>
            )}
            <div className="hidden sm:block">
              <div className="text-xs font-semibold text-provision-charcoal-dark leading-tight">
                {user.name?.split(" ")[0] || user.email}
              </div>
              {roleLabel && (
                <div className="text-[10px] text-provision-gray-text leading-tight">
                  {roleLabel}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
