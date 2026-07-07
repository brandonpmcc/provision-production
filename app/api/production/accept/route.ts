import { NextRequest, NextResponse } from "next/server";
import { crewNameByToken } from "@/lib/contractor-auth";

const BASE_ID = process.env.AIRTABLE_BASE_ID || "appHvFXShVSNjLCrG";
const PRODUCTION_TABLE = "tblsAq6MisZKzwqEG";

export async function POST(req: NextRequest) {
  const { productionId, token } = await req.json();

  if (!productionId || !token) {
    return NextResponse.json({ error: "Missing productionId or token" }, { status: 400 });
  }

  // Verify the token is valid
  const crewName = crewNameByToken(token);
  if (!crewName) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  const res = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${PRODUCTION_TABLE}/${productionId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: { "Crew Confirmed": true },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: 500 });
  }

  return NextResponse.json({ success: true, crewName });
}
