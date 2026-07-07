import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Search } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  coordinator: "Production Coordinator",
  manager:     "Production Manager",
  pm:          "Project Manager",
};

function roleFor(email?: string | null): string {
  if (!email) return "pm";
  if (["mirian@provisionpaints.com", "jacob@provisionpaints.com"].includes(email)) return "coordinator";
  return "pm";
}

export async function TopBar() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const role = roleFor(user?.email);

  return (
    <header
      className="bg-white border-b border-provision-gray-mid flex items-center justify-between px-5 flex-shrink-0"
      style={{ height: "52px" }}
    >
      {/* Search */}
      <div className="flex items-center gap-2 bg-provision-gray rounded-lg px-3 py-1.5 w-64 group focus-within:ring-2 focus-within:ring-provision-teal/40 transition-all">
        <Search className="w-3.5 h-3.5 text-provision-gray-muted flex-shrink-0" />
        <input
          type="search"
          placeholder="Search jobs, crews, customers…"
          className="bg-transparent text-sm outline-none w-full placeholder:text-provision-gray-muted"
        />
      </div>

      {/* Right — page identity + user */}
      <div className="flex items-center gap-3">
        {/* Role badge */}
        {user && (
          <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-provision-teal-light text-provision-teal text-[11px] font-bold uppercase tracking-wide">
            {ROLE_LABEL[role] || "Team Member"}
          </span>
        )}

        {/* User avatar */}
        {user && (
          <div className="flex items-center gap-2 border-l border-provision-gray-mid pl-3">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name || "User"}
                className="w-7 h-7 rounded-full ring-2 ring-provision-orange/20"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-provision-orange flex items-center justify-center text-[10px] font-black text-white uppercase">
                {(user.name ?? "?")
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
            )}
            <span className="text-[12px] font-bold text-provision-navy hidden sm:block uppercase tracking-wide">
              {user.name?.split(" ")[0] || user.email?.split("@")[0]}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
