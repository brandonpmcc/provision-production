import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { scheduleJob } from "@/lib/airtable";

export async function POST(req: NextRequest) {
  // Auth check — only coordinators and managers can schedule jobs
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      customerName,
      dealId,
      pmRecordId,
      crewName,
      startDate,
      endDate,
      budgetedHours,
      materialBudget,
      notes,
    } = body;

    if (!dealId || !crewName || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields: dealId, crewName, startDate, endDate" },
        { status: 400 }
      );
    }

    const productionId = await scheduleJob({
      customerName: customerName || "Unknown",
      dealId,
      pmRecordId: pmRecordId || null,
      crewName,
      startDate,
      endDate,
      budgetedHours: budgetedHours != null ? Number(budgetedHours) : null,
      materialBudget: materialBudget != null ? Number(materialBudget) : null,
      notes: notes || null,
    });

    return NextResponse.json({ productionId, success: true });
  } catch (err) {
    console.error("[schedule-job]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
