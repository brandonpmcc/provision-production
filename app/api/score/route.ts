export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { updateCrewScore } from "@/lib/airtable";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, scoreOnTime, scoreCustomerSat, scoreCommunication, scoreNotes } = body;

    if (!jobId || !scoreOnTime || !scoreCustomerSat || !scoreCommunication) {
      return NextResponse.json(
        { error: "Missing required fields: jobId, scoreOnTime, scoreCustomerSat, scoreCommunication" },
        { status: 400 }
      );
    }

    if (
      scoreOnTime < 1 || scoreOnTime > 5 ||
      scoreCustomerSat < 1 || scoreCustomerSat > 5 ||
      scoreCommunication < 1 || scoreCommunication > 5
    ) {
      return NextResponse.json({ error: "Scores must be between 1 and 5" }, { status: 400 });
    }

    await updateCrewScore(jobId, {
      scoreOnTime,
      scoreCustomerSat,
      scoreCommunication,
      scoreNotes,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[score API]", err);
    return NextResponse.json({ error: "Failed to save score" }, { status: 500 });
  }
}
