"use server";
import { revalidatePath } from "next/cache";
import {
  updateProductionJob,
  createProductionJob,
  type JobUpdatePayload,
} from "@/lib/airtable";

const BASE_ID = process.env.AIRTABLE_BASE_ID || "appHvFXShVSNjLCrG";
const PRODUCTION_TABLE = "tblsAq6MisZKzwqEG";

const REMINDER_FIELD: Record<string, string> = {
  "14day": "Reminder 14-Day Sent",
  "7day":  "Reminder 7-Day Sent",
  "3day":  "Reminder 3-Day Sent",
  "1day":  "Reminder 1-Day Sent",
};

/**
 * Mark a reminder as sent — writes today's date to the Production record via
 * the Airtable REST API (no SDK dependency).
 */
export async function markReminderSent(
  jobId: string,
  type: "14day" | "7day" | "3day" | "1day"
): Promise<void> {
  const field = REMINDER_FIELD[type];
  if (!field) return;
  const TOKEN = process.env.AIRTABLE_TOKEN;
  const today = new Date().toISOString().split("T")[0];
  const res = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${PRODUCTION_TABLE}/${jobId}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: { [field]: today } }),
      cache: "no-store",
    }
  );
  if (!res.ok) throw new Error(`Airtable PATCH failed: ${res.status}`);
  revalidatePath("/reminders");
}

/** Save edits to an existing Production Job. */
export async function saveJobEdit(
  jobId: string,
  updates: JobUpdatePayload
): Promise<void> {
  await updateProductionJob(jobId, updates);
  revalidatePath("/pipeline");
}

/** Activate a DJ Job by creating a new Production record. */
export async function activateAndSaveJob(
  customerName: string,
  dealId: string | null,
  updates: JobUpdatePayload
): Promise<string> {
  const newId = await createProductionJob(customerName, dealId, updates);
  revalidatePath("/pipeline");
  return newId;
}
