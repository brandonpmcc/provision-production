import { NextRequest, NextResponse } from "next/server";

const BASE_ID = "appHvFXShVSNjLCrG";
const PRODUCTION_TABLE = "tblsAq6MisZKzwqEG";

export async function POST(req: NextRequest) {
  const { productionId, checklist, existingNotes } = await req.json();
  if (!productionId) return NextResponse.json({ error: "Missing productionId" }, { status: 400 });

  // Embed checklist in notes field as a tagged JSON block
  const checklistStr = `[CHECKLIST]${JSON.stringify(checklist)}[/CHECKLIST]`;
  const cleanNotes = (existingNotes || "").replace(/\[CHECKLIST\].*?\[\/CHECKLIST\]/gs, "").trim();
  const newNotes = [cleanNotes, checklistStr].filter(Boolean).join("\n\n");

  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${PRODUCTION_TABLE}/${productionId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: { "Notes": newNotes } }),
  });

  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 });
  return NextResponse.json({ success: true });
}
