import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const BASE_ID     = "appHvFXShVSNjLCrG";
const DEALS_TABLE = "tblUhWSbH6r1nAC1h";

// Map internal ProductionStage → Airtable Deal "Current Stage" value
const PRODUCTION_TO_DEAL_STAGE: Record<string, string> = {
  "Pending Schedule":   "Project Pending Schedule",
  "Needs Confirmation": "Project Pending Schedule", // kept in pending until formal scheduling
  "Scheduled":          "Project Scheduled",
  "Materials Needed":   "Project Scheduled",        // still scheduled, materials phase
  "Ready to Start":     "Project Scheduled",
  "In Progress":        "Project In Progress",
  "Final Walkthrough":  "Touch Up Needed",
  "Pending Payment":    "RES Pending Payment",
  "Completed":          "Project Complete",
};

export async function POST(req: NextRequest) {
  // Auth — only coordinators and managers can move stages
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { dealId, productionStage } = await req.json();

    if (!dealId || !productionStage) {
      return NextResponse.json({ error: "Missing dealId or productionStage" }, { status: 400 });
    }

    const dealStage = PRODUCTION_TO_DEAL_STAGE[productionStage];
    if (!dealStage) {
      return NextResponse.json({ error: `Unknown stage: ${productionStage}` }, { status: 400 });
    }

    // Update Airtable Deal "Current Stage"
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${DEALS_TABLE}/${dealId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields: { "Current Stage": dealStage } }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    return NextResponse.json({ success: true, dealStage });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
