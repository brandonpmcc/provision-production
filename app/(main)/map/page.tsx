export const dynamic = "force-dynamic";
import nextDynamic from "next/dynamic";
import { getDJActiveJobs, getProductionJobs, getCrews } from "@/lib/airtable";
import type { MapJob } from "@/lib/types";

// Leaflet uses `window` → must be loaded client-side only
const MapClient = nextDynamic(() => import("@/components/MapClient"), { ssr: false });

export default async function MapPage() {
  const [djJobs, productionJobs, crews] = await Promise.all([
    getDJActiveJobs().catch(() => []),
    getProductionJobs().catch(() => []),
    getCrews().catch(() => []),
  ]);

  const prodByDealId = new Map(
    productionJobs
      .filter((p) => p.dealId)
      .map((p) => [p.dealId!, p])
  );

  const jobs: MapJob[] = djJobs.map((dj) => {
    const prod = dj.dealId ? prodByDealId.get(dj.dealId) : null;
    return {
      id:              prod?.id ?? dj.id,
      name:            dj.customer,
      address:         dj.address,
      zip:             dj.zip,
      city:            dj.city,
      projectType:     dj.projectType,
      pmName:          dj.pmName,
      value:           dj.revenue,
      productionStage: prod?.stage ?? "Pending Schedule",
      crew:            prod?.crew ?? null,
      startDate:       prod?.startDate ?? null,
      endDate:         prod?.endDate ?? null,
      isActivated:     !!prod,
    };
  });

  return <MapClient jobs={jobs} crews={crews} />;
}
