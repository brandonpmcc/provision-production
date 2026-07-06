export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions, roleFor, pmRecordId } from "@/lib/auth";
import { getDJActiveJobs, getProductionJobs, getCrews } from "@/lib/airtable";
import type { PipelineJob, ProductionStage } from "@/lib/types";
import { PipelineBoard } from "@/components/PipelineBoard";

export default async function PipelinePage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const role = roleFor(email);
  const myPmRecordId = pmRecordId(email);

  const [djJobs, productionJobs, crews] = await Promise.all([
    getDJActiveJobs().catch(() => []),
    getProductionJobs().catch(() => []),
    getCrews().catch(() => []),
  ]);

  // Index Production records by their linked Deal ID for fast lookup
  const productionByDealId = new Map(
    productionJobs
      .filter((p) => p.dealId)
      .map((p) => [p.dealId!, p])
  );

  // Merge each DJ Job with its Production record (if one exists)
  const allJobs: PipelineJob[] = djJobs.map((dj) => {
    const prod = dj.dealId ? productionByDealId.get(dj.dealId) : null;
    return {
      id: prod?.id ?? dj.id,
      djJobId: dj.id,
      dealId: dj.dealId,
      isActivated: !!prod,
      name: dj.customer,
      address: dj.address,
      zip: dj.zip,
      city: dj.city,
      state: dj.state,
      projectType: dj.projectType,
      value: dj.revenue,
      estimatedHours: dj.estLaborHours,
      pmName: dj.pmName,
      pmId: dj.pmId,
      // Production stage: use Production record if activated, otherwise Pending Schedule
      productionStage: (prod?.stage as ProductionStage) ?? "Pending Schedule",
      crew: prod?.crew ?? null,
      crew2: prod?.crew2 ?? null,
      startDate: prod?.startDate ?? null,
      endDate: prod?.endDate ?? null,
      customerConfirmedStart: prod?.customerConfirmedStart ?? false,
      crewConfirmed: prod?.crewConfirmed ?? false,
      colorStatus: prod?.colorStatus ?? null,
      materialStatus: prod?.materialStatus ?? null,
      specialMaterialsWarning: prod?.specialMaterialsWarning ?? null,
      siteWalkComplete: prod?.siteWalkComplete ?? false,
      companyCamUrl: prod?.companyCamUrl ?? null,
      notes: prod?.notes ?? null,
      scoreAvg: prod?.scoreAvg ?? null,
    };
  });

  // PMs (Colin, Nico, Tyler) only see their own jobs
  const jobs =
    role === "pm" && myPmRecordId
      ? allJobs.filter((j) => j.pmId === myPmRecordId)
      : allJobs;

  return (
    <PipelineBoard
      jobs={jobs}
      crews={crews}
      role={role}
    />
  );
}
