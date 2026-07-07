export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { crewNameByToken, TOKEN_TO_LOGIN } from "@/lib/contractor-auth";
import { getJobsForCrew } from "@/lib/airtable";
import type { ProductionJob } from "@/lib/types";
import { CrewPortalClient } from "./CrewPortalClient";

export default async function CrewSecretPortal({
  params,
}: {
  params: { token: string };
}) {
  const crewName = crewNameByToken(params.token);
  if (!crewName) notFound();

  const jobs = await getJobsForCrew(crewName).catch(() => [] as ProductionJob[]);

  // Sort: active first, then by start date
  const ACTIVE_ORDER: Record<string, number> = {
    "In Progress": 0, "Ready to Start": 1, "Materials Needed": 2,
    "Scheduled": 3, "Needs Confirmation": 4, "Final Walkthrough": 5,
    "Pending Schedule": 6, "Pending Payment": 7, "Completed": 8,
  };

  const sorted = [...jobs].sort((a, b) => {
    const ao = ACTIVE_ORDER[a.stage ?? ""] ?? 9;
    const bo = ACTIVE_ORDER[b.stage ?? ""] ?? 9;
    if (ao !== bo) return ao - bo;
    if (a.startDate && b.startDate) return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    return 0;
  });

  return (
    <CrewPortalClient
      crewName={crewName}
      token={params.token}
      jobs={sorted}
    />
  );
}
