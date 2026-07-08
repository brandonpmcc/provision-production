export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions, roleFor, pmRecordId } from "@/lib/auth";
import { getActivePipelineJobs, getCrews } from "@/lib/airtable";
import { PipelineBoard } from "@/components/PipelineBoard";

export default async function PipelinePage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const role = roleFor(email);
  const myPmRecordId = pmRecordId(email);

  const [allJobs, crews] = await Promise.all([
    getActivePipelineJobs().catch(() => []),
    getCrews().catch(() => []),
  ]);

  // PMs only see their own jobs
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
