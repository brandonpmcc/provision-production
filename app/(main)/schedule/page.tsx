export const dynamic = "force-dynamic";
import { getProductionJobs, getCrews, getMonthlyGoal } from "@/lib/airtable";
import { ScheduleBoard } from "@/components/ScheduleBoard";

export default async function SchedulePage() {
  const now = new Date();
  const [jobs, crews, monthGoal] = await Promise.all([
    getProductionJobs().catch(() => []),
    getCrews().catch(() => []),
    getMonthlyGoal(now.getFullYear(), now.getMonth() + 1).catch(() => null),
  ]);

  // Build crew → color name map for the calendar
  const crewColors: Record<string, string> = {};
  for (const c of crews) {
    if (c.color) crewColors[c.name] = c.color;
  }

  const weeklyTarget = monthGoal?.productionGoal
    ? Math.round(monthGoal.productionGoal / 4.33)
    : null;

  return (
    <ScheduleBoard
      jobs={jobs}
      crewColors={crewColors}
      weeklyTarget={weeklyTarget}
    />
  );
}
