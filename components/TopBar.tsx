import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Search, Bell } from "lucide-react";

export async function TopBar() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  return (
    <header className="h-13 bg-white border-b border-provision-gray-mid flex items-center justify-between px-5 flex-shrink-0" style={{ height: "52px" }}>
      {/* Search */}
      <div className="flex items-center gap-2 bg-provision-gray rounded-lg px-3 py-1.5 w-72">
        <Search className="w-3.5 h-3.5 text-provision-gray-muted flex-shrink-0" />
        <input
          type="search"
          placeholder="Search jobs, customers…"
          className="bg-transparent text-sm outline-none w-full placeholder:text-provision-gray-muted"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg hover:bg-provision-gray transition relative">
          <Bell className="w-4 h-4 text-provision-gray-text" />
        </button>

        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-provision-gray-mid">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name || "User"}
                className="w-7 h-7 rounded-full ring-1 ring-provision-gray-mid"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-provision-orange flex items-center justify-center text-[10px] font-bold text-white">
                {(user.name ?? "?")
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
            )}
            <span className="text-xs font-semibold text-provision-charcoal hidden sm:block">
              {user.name?.split(" ")[0] || user.email?.split("@")[0]}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
