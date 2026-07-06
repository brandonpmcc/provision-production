import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ContractorSidebar } from "@/components/ContractorSidebar";
import { ContractorTopBar } from "@/components/ContractorTopBar";

export default async function ContractorLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "contractor") {
    redirect("/contractor-login");
  }
  return (
    <div className="flex min-h-screen">
      <ContractorSidebar crewName={(session.user as { name?: string }).name ?? ""} />
      <div className="flex-1 flex flex-col min-w-0">
        <ContractorTopBar crewName={(session.user as { name?: string }).name ?? ""} />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
