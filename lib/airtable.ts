/**
 * Airtable client + queries — uses native fetch (Node.js 18+).
 * Replaces the airtable npm SDK which has silent failures on Node.js 22 / Vercel.
 */

import type {
  Deal,
  ProductionJob,
  DJActiveJob,
  Crew,
  CrewHealth,
  MonthlyGoal,
  Person,
  Contact,
  Trade,
  Zone,
  ProductionStage,
  DealStage,
  PipelineJob,
} from "./types";
import { pmRecordIdByName, PM_NAME_TO_RECORD_ID } from "./auth";
import { getTerritoryByZip, TERRITORIES, type TerritoryId, type TerritoryStats } from "./territories";

const BASE_ID = process.env.AIRTABLE_BASE_ID || "appHvFXShVSNjLCrG";

// ─── Airtable REST API helpers ────────────────────────────────────────────────

type AirtableRecord = { id: string; fields: Record<string, unknown> };

/** Build query string, supporting repeated keys like fields[] */
function buildParams(obj: Record<string, string | string[]>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) {
      for (const item of v) parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(item)}`);
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    }
  }
  return parts.join("&");
}

/** Fetch all records from a table, handling pagination automatically */
async function fetchAll(
  tableId: string,
  options: {
    filterByFormula?: string;
    fields?: string[];
    sort?: Array<{ field: string; direction?: "asc" | "desc" }>;
    maxRecords?: number;
  } = {}
): Promise<AirtableRecord[]> {
  const TOKEN = process.env.AIRTABLE_TOKEN;
  if (!TOKEN) {
    console.error("[airtable] AIRTABLE_TOKEN is not set — queries will return empty.");
    return [];
  }

  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const params: Record<string, string | string[]> = { pageSize: "100" };
    if (options.filterByFormula) params.filterByFormula = options.filterByFormula;
    if (options.fields?.length) params["fields[]"] = options.fields;
    if (options.maxRecords) params.maxRecords = String(options.maxRecords);
    if (offset) params.offset = offset;
    if (options.sort) {
      for (let i = 0; i < options.sort.length; i++) {
        params[`sort[${i}][field]`] = options.sort[i].field;
        if (options.sort[i].direction) params[`sort[${i}][direction]`] = options.sort[i].direction!;
      }
    }

    const url = `https://api.airtable.com/v0/${BASE_ID}/${tableId}?${buildParams(params)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[airtable] ${res.status} fetching ${tableId}: ${text}`);
      break;
    }

    const data = await res.json() as { records: AirtableRecord[]; offset?: string };
    records.push(...data.records);
    offset = data.offset;
  } while (offset && records.length < (options.maxRecords ?? 10_000));

  return records;
}

/** PATCH a single record */
async function patchRecord(
  tableId: string,
  recordId: string,
  fields: Record<string, unknown>
): Promise<void> {
  const TOKEN = process.env.AIRTABLE_TOKEN;
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${tableId}/${recordId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[airtable] PATCH ${tableId}/${recordId} → ${res.status}: ${text}`);
  }
}

/** POST to create records */
async function createRecords(
  tableId: string,
  records: Array<{ fields: Record<string, unknown> }>
): Promise<AirtableRecord[]> {
  const TOKEN = process.env.AIRTABLE_TOKEN;
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${tableId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ records }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[airtable] POST ${tableId} → ${res.status}: ${text}`);
  }
  const data = await res.json() as { records: AirtableRecord[] };
  return data.records;
}

// ─── Field-value helpers (same signatures as before) ─────────────────────────

function pickName(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && "name" in value) {
    return String((value as { name: unknown }).name);
  }
  return null;
}

function pickFirstLink(value: unknown): string | null {
  if (Array.isArray(value) && value.length > 0) return String(value[0]);
  return null;
}

function pickNumber(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    return isNaN(n) ? null : n;
  }
  return null;
}

function pickBoolean(value: unknown): boolean {
  return value === true;
}

function pickString(value: unknown): string | null {
  if (typeof value === "string") return value;
  return null;
}

function pickMultiSelect(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => pickName(v)).filter((v): v is string => Boolean(v));
  }
  return [];
}

// ─── Table IDs ────────────────────────────────────────────────────────────────

const TABLES = {
  deals:              "tblUhWSbH6r1nAC1h",
  production:         "tblsAq6MisZKzwqEG",
  crews:              "tblv65HTsbzDYxBLB",
  monthlyPerformance: "tbla1KWFdqizh7qjU",
  people:             "tblOZSeJ7T8gVwn6C",
  djJobs:             "tblYf9VDwY40hP0qE",
  contacts:           "tblQ2uyUiZEqRjGKm",
} as const;

// ─── ZIP / address helpers ────────────────────────────────────────────────────

function parseZipFromAddress(address: string): string {
  const match = address.match(/\b(\d{5})\b/);
  return match ? match[1] : "";
}

function parseCityFromAddress(address: string): string {
  const parts = address.split(",").map((s) => s.trim());
  if (parts.length >= 3) return parts[parts.length - 3];
  return "";
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/** All deals in production-relevant stages (dashboard KPIs) */
export async function getProductionDeals(): Promise<Deal[]> {
  // "Project Scheduled" confirmed in Airtable — deals that are booked but not yet started
  const records = await fetchAll(TABLES.deals, {
    filterByFormula: `OR({Current Stage}='Project Pending Schedule',{Current Stage}='Project Scheduled',{Current Stage}='Project In Progress',{Current Stage}='RES Pending Payment')`,
    maxRecords: 200,
  });

  return records.map((r) => ({
    id: r.id,
    name:          pickString(r.fields["Deal Name"]) || "(no name)",
    stage:         (pickName(r.fields["Current Stage"]) as DealStage) || null,
    address:       pickString(r.fields["Deal Address"]) || "",
    city:          pickString(r.fields["Deal City"]) || "",
    state:         pickString(r.fields["Deal State"]) || "",
    zip:           pickString(r.fields["Deal Zip"]) || "",
    projectType:   pickName(r.fields["Project Type"]),
    pmId:          pickFirstLink(r.fields["PM"]),
    value:         pickNumber(r.fields["Value: Deal"]),
    budgetedHours: pickNumber(r.fields["Budgeted Hours"]),
    contactId:     pickFirstLink(r.fields["Contact"]),
    productionId:  pickFirstLink(r.fields["Production"]),
  }));
}

/** Active DJ Jobs (DripJobs work orders — Scheduled, Pending, or Accepted) */
export async function getDJActiveJobs(): Promise<DJActiveJob[]> {
  // "Accepted" confirmed in Airtable — DripJobs uses this for newly-accepted proposals
  const djRecords = await fetchAll(TABLES.djJobs, {
    filterByFormula: `OR({Job Stage}="Scheduled",{Job Stage}="Pending",{Job Stage}="Accepted")`,
    maxRecords: 500,
  });

  // Collect linked Deal IDs
  const dealIdSet = new Set<string>();
  for (const r of djRecords) {
    const links = r.fields["Deal"];
    if (Array.isArray(links) && links.length > 0) dealIdSet.add(String(links[0]));
  }
  const dealIds = [...dealIdSet];

  // Batch-fetch Deals for enrichment
  const dealMap = new Map<string, AirtableRecord>();
  const CHUNK = 80;
  for (let i = 0; i < dealIds.length; i += CHUNK) {
    const chunk = dealIds.slice(i, i + CHUNK);
    const formula =
      chunk.length === 1
        ? `RECORD_ID()="${chunk[0]}"`
        : `OR(${chunk.map((id) => `RECORD_ID()="${id}"`).join(",")})`;
    const dealRecords = await fetchAll(TABLES.deals, {
      filterByFormula: formula,
      fields: ["Deal Name", "Deal Address", "Deal City", "Deal State", "Deal Zip", "Project Type", "Value: Deal"],
      maxRecords: CHUNK,
    });
    for (const d of dealRecords) dealMap.set(d.id, d);
  }

  // Collect Customer IDs for contact enrichment
  const customerIdSet = new Set<string>();
  for (const r of djRecords) {
    const cid = pickString(r.fields["Customer ID"]);
    if (cid) customerIdSet.add(cid);
  }

  // Batch-fetch Contacts by DripJobs Customer ID to get phone/email
  const contactMap = new Map<string, { name: string; phone: string | null; email: string | null }>();
  const customerIds = [...customerIdSet];
  const CID_CHUNK = 80;
  for (let i = 0; i < customerIds.length; i += CID_CHUNK) {
    const chunk = customerIds.slice(i, i + CID_CHUNK);
    const formula =
      chunk.length === 1
        ? `{DripJobs Customer ID}="${chunk[0]}"`
        : `OR(${chunk.map((id) => `{DripJobs Customer ID}="${id}"`).join(",")})`;
    const contactRecords = await fetchAll(TABLES.contacts, {
      filterByFormula: formula,
      fields: ["Contact Name", "Phone", "Email", "DripJobs Customer ID"],
      maxRecords: CID_CHUNK,
    }).catch(() => []);
    for (const c of contactRecords) {
      const cid = pickString(c.fields["DripJobs Customer ID"]);
      if (cid) {
        contactMap.set(cid, {
          name:  pickString(c.fields["Contact Name"]) || "",
          phone: pickString(c.fields["Phone"]),
          email: pickString(c.fields["Email"]),
        });
      }
    }
  }

  return djRecords.map((r) => {
    const djAddress  = pickString(r.fields["Address"]) || "";
    const pmName     = pickString(r.fields["Project Manager"]);
    const dealLinks  = r.fields["Deal"];
    const dealId     = Array.isArray(dealLinks) && dealLinks.length > 0 ? String(dealLinks[0]) : null;
    const deal       = dealId ? dealMap.get(dealId) : null;
    const address    = (deal ? pickString(deal.fields["Deal Address"]) : null) || djAddress;
    const customerId = pickString(r.fields["Customer ID"]);
    const contact    = customerId ? contactMap.get(customerId) : null;

    return {
      id:             r.id,
      jobId:          pickString(r.fields["Job ID"]),
      customer:       pickString(r.fields["Customer"]) || "(unknown)",
      address,
      zip:            (deal ? pickString(deal.fields["Deal Zip"]) : null) || parseZipFromAddress(djAddress),
      city:           (deal ? pickString(deal.fields["Deal City"]) : null) || parseCityFromAddress(djAddress),
      state:          (deal ? pickString(deal.fields["Deal State"]) : null) || "",
      projectType:    deal ? pickName(deal.fields["Project Type"]) : null,
      pmName,
      pmId:           pmRecordIdByName(pmName),
      revenue:        pickNumber(r.fields["Revenue"]),
      estLaborHours:  pickNumber(r.fields["Est Labor Hours"]),
      estLaborCost:   pickNumber(r.fields["Est Labor Cost"]),
      estMaterials:   pickNumber(r.fields["Est Materials"]),
      djStage:        pickString(r.fields["Job Stage"]),
      dealId,
      customerId:     customerId || null,
      scrapedAt:      pickString(r.fields["Scraped At"]),
      // Contact enrichment from Contacts table via Customer ID
      customerPhone:       contact?.phone ?? null,
      customerEmail:       contact?.email ?? null,
      customerContactName: contact?.name ?? null,
    };
  });
}

/** Production jobs for a specific crew */
export async function getJobsForCrew(crewName: string): Promise<ProductionJob[]> {
  if (!crewName) return [];
  // Filter by Crew field matching the crew name
  const formula = `OR({Crew}="${crewName.replace(/"/g, '\\"')}", {Crew 2 (Split Job)}="${crewName.replace(/"/g, '\\"')}")`;
  const records = await fetchAll(TABLES.production, {
    filterByFormula: formula,
    sort: [{ field: "Start Date", direction: "asc" }],
    maxRecords: 500,
  });

  return records.map(mapProductionJob);
}

/** All production jobs */
export async function getProductionJobs(): Promise<ProductionJob[]> {
  const records = await fetchAll(TABLES.production, { maxRecords: 500 });

  return records.map((r) => mapProductionJob(r));
}

/** Helper to map Airtable record to ProductionJob */
function mapProductionJob(r: AirtableRecord): ProductionJob {
  return {
    id:                     r.id,
    job:                    pickString(r.fields["Job"]) || "(no name)",
    dealId:                 pickFirstLink(r.fields["Deal"]),
    stage:                  (pickName(r.fields["Production Stage"]) as ProductionStage) || null,
    pmId:                   pickFirstLink(r.fields["PM"]),
    crew:                   pickString(r.fields["Crew"]),
    crew2:                  pickString(r.fields["Crew 2 (Split Job)"]),
    startDate:              pickString(r.fields["Start Date"]),
    endDate:                pickString(r.fields["End Date"]),
    customerConfirmedStart: pickBoolean(r.fields["Customer Confirmed Start"]),
    crewConfirmed:          pickBoolean(r.fields["Crew Confirmed"]),
    colorSelectionComplete: pickBoolean(r.fields["Color Selection Complete"]),
    colorStatus:            (pickName(r.fields["Color Status"]) as ProductionJob["colorStatus"]) || null,
    materialsOrdered:       pickBoolean(r.fields["Materials Ordered"]),
    materialsReceived:      pickBoolean(r.fields["Materials Received"]),
    materialStatus:         (pickName(r.fields["Material Status"]) as ProductionJob["materialStatus"]) || null,
    specialMaterialsWarning:pickString(r.fields["Special Materials Warning"]),
    siteWalkComplete:       pickBoolean(r.fields["Site Walk Complete"]),
    companyCamUrl:          pickString(r.fields["CompanyCam Project URL"]),
    companyCamProjectId:    pickString(r.fields["CompanyCam Project ID"]),
    notes:                  pickString(r.fields["Notes"]),
    scoreOnTime:            pickNumber(r.fields["Score: On-Time"]),
    scoreCustomerSat:       pickNumber(r.fields["Score: Customer Satisfaction"]),
    scoreCommunication:     pickNumber(r.fields["Score: Communication"]),
    scoreAvg:               pickNumber(r.fields["Crew Score Avg"]),
    scoreNotes:             pickString(r.fields["Score Notes"]),
    scoreDate:              pickString(r.fields["Score Date"]),
    reminder14daySent:      pickString(r.fields["Reminder 14-Day Sent"]),
    reminder7daySent:       pickString(r.fields["Reminder 7-Day Sent"]),
    reminder3daySent:       pickString(r.fields["Reminder 3-Day Sent"]),
    reminder1daySent:       pickString(r.fields["Reminder 1-Day Sent"]),
  };
}

/** Fetch customer contacts by record IDs */
export async function getContactsByIds(ids: string[]): Promise<Contact[]> {
  if (ids.length === 0) return [];
  const unique = [...new Set(ids)];
  const results: Contact[] = [];
  const CHUNK = 80;

  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    const formula =
      chunk.length === 1
        ? `RECORD_ID()="${chunk[0]}"`
        : `OR(${chunk.map((id) => `RECORD_ID()="${id}"`).join(",")})`;

    const records = await fetchAll(TABLES.contacts, {
      filterByFormula: formula,
      fields: ["Contact Name", "Email", "Phone"],
      maxRecords: CHUNK,
    });
    for (const r of records) {
      results.push({
        id:    r.id,
        name:  pickString(r.fields["Contact Name"]),
        email: pickString(r.fields["Email"]),
        phone: pickString(r.fields["Phone"]),
      });
    }
  }
  return results;
}

/** Fetch Deal → Contact ID mapping for the Reminders page */
export async function getDealContactIds(dealIds: string[]): Promise<Map<string, string>> {
  if (dealIds.length === 0) return new Map();
  const unique = [...new Set(dealIds)];
  const result = new Map<string, string>();
  const CHUNK = 80;

  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    const formula =
      chunk.length === 1
        ? `RECORD_ID()="${chunk[0]}"`
        : `OR(${chunk.map((id) => `RECORD_ID()="${id}"`).join(",")})`;

    const records = await fetchAll(TABLES.deals, {
      filterByFormula: formula,
      fields: ["Contact"],
      maxRecords: CHUNK,
    });
    for (const r of records) {
      const contactId = pickFirstLink(r.fields["Contact"]);
      if (contactId) result.set(r.id, contactId);
    }
  }
  return result;
}

/** All active crews */
export async function getCrews(): Promise<Crew[]> {
  const records = await fetchAll(TABLES.crews, {
    filterByFormula: `{Active}=1`,
    sort: [{ field: "Crew Name", direction: "asc" }],
    maxRecords: 200,
  });

  return records.map((r) => ({
    id:               r.id,
    name:             pickString(r.fields["Crew Name"]) || "",
    color:            pickName(r.fields["Color"]),
    trades:           pickMultiSelect(r.fields["Trades"]) as Trade[],
    coverageAreas:    pickMultiSelect(r.fields["Coverage Areas"]) as Zone[],
    leadContactName:  pickString(r.fields["Lead Contact Name"]),
    leadContactPhone: pickString(r.fields["Lead Contact Phone"]),
    inHouse:          pickBoolean(r.fields["In-House"]),
    active:           pickBoolean(r.fields["Active"]),
  }));
}

/** Compute per-crew health stats (pure function — no API calls) */
export function computeCrewHealth(jobs: ProductionJob[], deals: Deal[]): CrewHealth[] {
  const dealMap = new Map(deals.map((d) => [d.id, d]));
  const byCrewName = new Map<string, ProductionJob[]>();
  for (const j of jobs) {
    if (!j.crew) continue;
    if (!byCrewName.has(j.crew)) byCrewName.set(j.crew, []);
    byCrewName.get(j.crew)!.push(j);
  }
  const results: CrewHealth[] = [];
  const activeStages: ProductionStage[] = ["Scheduled","Materials Needed","Ready to Start","In Progress","Needs Confirmation"];
  const avg = (arr: (number | null)[]) => {
    const vals = arr.filter((v): v is number => v != null);
    if (!vals.length) return null;
    return Math.round((vals.reduce((a, b) => a + b) / vals.length) * 10) / 10;
  };

  for (const [crewName, crewJobs] of byCrewName) {
    const scoredJobs = crewJobs.filter((j) => j.scoreAvg != null);
    const activeJobs = crewJobs.filter((j) => j.stage && activeStages.includes(j.stage));
    let scheduledHours = 0;
    for (const j of activeJobs) {
      const deal = j.dealId ? dealMap.get(j.dealId) : null;
      if (deal?.budgetedHours) scheduledHours += deal.budgetedHours;
    }
    results.push({
      crewName, color: null,
      totalJobs: crewJobs.length, scoredJobs: scoredJobs.length,
      avgOnTime: avg(scoredJobs.map((j) => j.scoreOnTime)),
      avgCustomerSat: avg(scoredJobs.map((j) => j.scoreCustomerSat)),
      avgCommunication: avg(scoredJobs.map((j) => j.scoreCommunication)),
      avgOverall: avg(scoredJobs.map((j) => j.scoreAvg)),
      activeJobs: activeJobs.length, scheduledHours,
    });
  }
  return results.sort((a, b) => b.activeJobs - a.activeJobs);
}

// ─── Write operations ─────────────────────────────────────────────────────────

export async function updateCrewScore(
  jobId: string,
  scores: { scoreOnTime: number; scoreCustomerSat: number; scoreCommunication: number; scoreNotes?: string }
): Promise<void> {
  await patchRecord(TABLES.production, jobId, {
    "Score: On-Time":             scores.scoreOnTime,
    "Score: Customer Satisfaction": scores.scoreCustomerSat,
    "Score: Communication":       scores.scoreCommunication,
    "Score Notes":                scores.scoreNotes || "",
    "Score Date":                 new Date().toISOString().split("T")[0],
  });
}

export async function updateJobStage(jobId: string, stage: string): Promise<void> {
  await patchRecord(TABLES.production, jobId, { "Production Stage": stage });
}

export type JobUpdatePayload = {
  stage?: string | null; crew?: string | null; crew2?: string | null;
  startDate?: string | null; endDate?: string | null;
  customerConfirmedStart?: boolean; crewConfirmed?: boolean;
  colorStatus?: string | null; materialStatus?: string | null;
  specialMaterialsWarning?: string | null; companyCamUrl?: string | null; notes?: string | null;
};

export async function updateProductionJob(jobId: string, updates: JobUpdatePayload): Promise<void> {
  const fields: Record<string, unknown> = {};
  if ("stage" in updates)                   fields["Production Stage"]          = updates.stage ?? null;
  if ("crew" in updates)                    fields["Crew"]                       = updates.crew ?? "";
  if ("crew2" in updates)                   fields["Crew 2 (Split Job)"]         = updates.crew2 ?? "";
  if ("startDate" in updates)               fields["Start Date"]                 = updates.startDate ?? null;
  if ("endDate" in updates)                 fields["End Date"]                   = updates.endDate ?? null;
  if ("customerConfirmedStart" in updates)  fields["Customer Confirmed Start"]   = updates.customerConfirmedStart;
  if ("crewConfirmed" in updates)           fields["Crew Confirmed"]             = updates.crewConfirmed;
  if ("colorStatus" in updates)             fields["Color Status"]               = updates.colorStatus ?? null;
  if ("materialStatus" in updates)          fields["Material Status"]            = updates.materialStatus ?? null;
  if ("specialMaterialsWarning" in updates) fields["Special Materials Warning"]  = updates.specialMaterialsWarning ?? "";
  if ("companyCamUrl" in updates)           fields["CompanyCam Project URL"]     = updates.companyCamUrl ?? "";
  if ("notes" in updates)                   fields["Notes"]                      = updates.notes ?? "";
  if (Object.keys(fields).length === 0) return;
  await patchRecord(TABLES.production, jobId, fields);
}

export async function createProductionJob(
  customerName: string,
  dealId: string | null,
  updates: JobUpdatePayload
): Promise<string> {
  const fields: Record<string, unknown> = { "Job": customerName };
  if (dealId) fields["Deal"] = [{ id: dealId }];
  if (updates.stage)                    fields["Production Stage"]          = updates.stage;
  if (updates.crew)                     fields["Crew"]                       = updates.crew;
  if (updates.crew2)                    fields["Crew 2 (Split Job)"]         = updates.crew2;
  if (updates.startDate)                fields["Start Date"]                 = updates.startDate;
  if (updates.endDate)                  fields["End Date"]                   = updates.endDate;
  if (updates.customerConfirmedStart != null) fields["Customer Confirmed Start"] = updates.customerConfirmedStart;
  if (updates.crewConfirmed != null)    fields["Crew Confirmed"]             = updates.crewConfirmed;
  if (updates.colorStatus)              fields["Color Status"]               = updates.colorStatus;
  if (updates.materialStatus)           fields["Material Status"]            = updates.materialStatus;
  if (updates.specialMaterialsWarning)  fields["Special Materials Warning"]  = updates.specialMaterialsWarning;
  if (updates.companyCamUrl)            fields["CompanyCam Project URL"]     = updates.companyCamUrl;
  if (updates.notes)                    fields["Notes"]                      = updates.notes;
  const created = await createRecords(TABLES.production, [{ fields }]);
  return created[0].id;
}


/**
 * Schedule a job from the Pending Queue.
 * Creates a Production record in Airtable and advances the Deal to "Project Scheduled".
 */
export async function scheduleJob(params: {
  customerName: string;
  dealId: string;
  pmRecordId: string | null;
  crewName: string;
  startDate: string;
  endDate: string;
  budgetedHours: number | null;
  materialBudget: number | null;
  notes: string | null;
}): Promise<string> {
  const { customerName, dealId, pmRecordId, crewName, startDate, endDate, budgetedHours, materialBudget, notes } = params;

  // 1. Create Production record with initial "Needs Confirmation" stage
  const fields: Record<string, unknown> = {
    "Job":              customerName,
    "Deal":             [{ id: dealId }],
    "Production Stage": "Needs Confirmation",
    "Crew":             crewName,
    "Start Date":       startDate,
    "End Date":         endDate,
  };
  if (pmRecordId) fields["PM"] = [{ id: pmRecordId }];
  if (notes)      fields["Notes"] = notes;

  const created = await createRecords(TABLES.production, [{ fields }]);
  const productionId = created[0].id;

  // 2. Update Deal — advance to "Project Scheduled" and write budget fields
  const dealFields: Record<string, unknown> = { "Current Stage": "Project Scheduled" };
  if (budgetedHours  != null) dealFields["Budgeted Hours"]     = budgetedHours;
  if (materialBudget != null) dealFields["Target LM Material"] = materialBudget;
  await patchRecord(TABLES.deals, dealId, dealFields);

  return productionId;
}

/** Update a Deal's stage and optional budget fields */
export async function updateDealStage(
  dealId: string,
  stage: string,
  extras?: { budgetedHours?: number; materialBudget?: number }
): Promise<void> {
  const fields: Record<string, unknown> = { "Current Stage": stage };
  if (extras?.budgetedHours  != null) fields["Budgeted Hours"]     = extras.budgetedHours;
  if (extras?.materialBudget != null) fields["Target LM Material"] = extras.materialBudget;
  await patchRecord(TABLES.deals, dealId, fields);
}


// ─── Completed jobs / Invoice review ─────────────────────────────────────────

export interface CompletedJobReview {
  id: string;
  name: string;
  stage: string;
  value: number | null;
  invoicedTotal: number | null;
  openBalance: number | null;
  collectedInFull: boolean;
  pmId: string | null;
  zip: string;
  /** True = needs someone to look at it */
  needsReview: boolean;
  reviewReason: string;
}

/**
 * Fetch completed and pending-payment deals and flag ones that need invoice review.
 * Flags:
 *  - Open balance > 0
 *  - Invoiced total is null/zero on a completed job
 *  - Stage is "Project Complete" but not collected in full
 */
export async function getCompletedJobsNeedingReview(): Promise<CompletedJobReview[]> {
  const records = await fetchAll(TABLES.deals, {
    filterByFormula: `OR({Current Stage}='Project Complete',{Current Stage}='RES Pending Payment',{Current Stage}='Touch Up Needed')`,
    maxRecords: 200,
    fields: [
      "Deal Name", "Current Stage", "Value: Deal",
      "Invoiced Total", "Open Balance", "Collected In Full",
      "PM", "Deal Zip",
    ],
  });

  return records.map((r) => {
    const openBalance    = pickNumber(r.fields["Open Balance"]);
    const invoicedTotal  = pickNumber(r.fields["Invoiced Total"]);
    const collectedInFull = !!(r.fields["Collected In Full"]);
    const value          = pickNumber(r.fields["Value: Deal"]);
    const stage          = pickName(r.fields["Current Stage"]) ?? "";

    let needsReview = false;
    let reviewReason = "";

    if (openBalance && openBalance > 50) {
      needsReview = true;
      reviewReason = `Open balance: $${openBalance.toLocaleString()}`;
    } else if (!invoicedTotal || invoicedTotal === 0) {
      needsReview = true;
      reviewReason = "No invoice recorded";
    } else if (stage === "Project Complete" && !collectedInFull) {
      needsReview = true;
      reviewReason = "Invoice unpaid / not collected in full";
    }

    return {
      id: r.id,
      name: pickString(r.fields["Deal Name"]) || "(no name)",
      stage,
      value,
      invoicedTotal,
      openBalance,
      collectedInFull,
      pmId: pickFirstLink(r.fields["PM"]),
      zip: pickString(r.fields["Deal Zip"]) ?? "",
      needsReview,
      reviewReason,
    };
  });
}

// ─── Monthly goals ────────────────────────────────────────────────────────────

function mapGoal(r: AirtableRecord, fallbackMonth = 0, fallbackYear = 0): MonthlyGoal {
  return {
    id:               r.id,
    period:           String(r.fields["Period"] || ""),
    month:            pickName(r.fields["Month"]) || "",
    monthNumber:      pickNumber(r.fields["Month #"]) || fallbackMonth,
    year:             pickNumber(r.fields["Year"]) || fallbackYear,
    productionGoal:   pickNumber(r.fields["Monthly Production Goal"]),
    revenueGoal:      pickNumber(r.fields["Monthly Revenue Goal"]),
    salesGoal:        pickNumber(r.fields["Monthly Sales Goal"]),
    jobsProducedGoal: pickNumber(r.fields["Jobs Produced Goal"]),
    avgJobSizeGoal:   pickNumber(r.fields["Average Job Size Goal"]),
    laborBudget:      pickNumber(r.fields["Labor Cost Budget"]),
    materialBudget:   pickNumber(r.fields["Material Cost Budget"]),
    actualProduction: pickNumber(r.fields["Actual Production"]),
    actualRevenue:    pickNumber(r.fields["Actual Revenue"]),
  };
}

export async function getMonthlyGoal(year: number, month: number): Promise<MonthlyGoal | null> {
  const records = await fetchAll(TABLES.monthlyPerformance, {
    filterByFormula: `AND({Year}=${year},{Month #}=${month})`,
    maxRecords: 1,
  });
  return records[0] ? mapGoal(records[0], month, year) : null;
}

export async function getMonthlyGoals(year: number): Promise<MonthlyGoal[]> {
  const records = await fetchAll(TABLES.monthlyPerformance, {
    filterByFormula: `{Year}=${year}`,
    sort: [{ field: "Month #", direction: "asc" }],
  });
  return records.map((r) => mapGoal(r, 0, year));
}

export async function getPeople(): Promise<Person[]> {
  const records = await fetchAll(TABLES.people, { maxRecords: 100 });
  return records.map((r) => ({
    id:    r.id,
    name:  pickString(r.fields["Name"]) || "(unknown)",
    role:  pickName(r.fields["Role"]),
    email: pickString(r.fields["Email"]),
  }));
}

// ─── Active Pipeline & Territory Queries ──────────────────────────────────────

/**
 * Helper to calculate week ranges for filtering jobs
 */
function getWeekRange(weeksFromNow: number): { start: string; end: string } {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1 + weeksFromNow * 7);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  return {
    start: startOfWeek.toISOString().split("T")[0],
    end: endOfWeek.toISOString().split("T")[0],
  };
}

/**
 * Get all ACTIVE pipeline jobs - merges DJActiveJobs with Production records.
 * Filters OUT: Completed, Cancelled, Archived, Final Walkthrough (if has payment/completed)
 * Includes: Pending Schedule, Needs Confirmation, Scheduled, Materials Needed,
 *           Ready to Start, In Progress, Final Walkthrough, Pending Payment
 */
export async function getActivePipelineJobs(): Promise<PipelineJob[]> {
  const [djJobs, prodJobs] = await Promise.all([getDJActiveJobs(), getProductionJobs()]);

  // Index production jobs by dealId for quick lookup
  const prodJobByDealId = new Map<string, ProductionJob>();
  for (const pj of prodJobs) {
    if (pj.dealId) {
      prodJobByDealId.set(pj.dealId, pj);
    }
  }

  const result: PipelineJob[] = [];

  // Process each DJ active job
  for (const dj of djJobs) {
    const prod = dj.dealId ? prodJobByDealId.get(dj.dealId) : null;

    // ── Infer production stage from DripJobs data when no Production record exists ──
    // This makes the pipeline reflect real Airtable/DripJobs data even before
    // Miriam creates Production records through the scheduling flow.
    let inferredStage: ProductionStage = "Pending Schedule";
    if (!prod) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dj.djStage === "Scheduled") {
        // DJ "Scheduled" = the job has been won and is on the books
        // Default to Scheduled (no start date on DJ Jobs — that lives in Production records)
        inferredStage = "Scheduled";
      } else if (dj.djStage === "Pending" || dj.djStage === "Accepted") {
        inferredStage = "Pending Schedule";
      }
    }

    // Build pipeline job
    const job: PipelineJob = {
      id: prod?.id || dj.id,
      djJobId: dj.id,
      dealId: dj.dealId,
      isActivated: !!prod,
      name: dj.customer,
      address: dj.address,
      zip: dj.zip,
      city: dj.city,
      state: dj.state,
      projectType: dj.projectType,
      value: dj.revenue,
      estimatedHours:      dj.estLaborHours,
      estimatedLaborCost:  dj.estLaborCost,
      estimatedMaterials:  dj.estMaterials,
      pmName: dj.pmName,
      pmId:   dj.pmId,
      // Contact info enriched from Contacts table via DripJobs Customer ID
      customerPhone:       dj.customerPhone,
      customerEmail:       dj.customerEmail,
      customerContactName: dj.customerContactName,
      // Use Production record stage if it exists, otherwise infer from DripJobs
      productionStage: (prod?.stage ?? inferredStage) as ProductionStage,
      crew: prod?.crew ?? null,
      crew2: prod?.crew2 ?? null,
      startDate: prod?.startDate ?? null,
      endDate: prod?.endDate ?? null,
      customerConfirmedStart: prod?.customerConfirmedStart ?? false,
      crewConfirmed: prod?.crewConfirmed ?? false,
      colorStatus: prod?.colorStatus ?? null,
      materialStatus: prod?.materialStatus ?? null,
      specialMaterialsWarning: prod?.specialMaterialsWarning ?? null,
      siteWalkComplete: prod?.siteWalkComplete ?? false,
      companyCamUrl: prod?.companyCamUrl ?? null,
      notes: prod?.notes ?? null,
      scoreAvg: prod?.scoreAvg ?? null,
    };

    // Filter: skip "Completed" production jobs
    if (job.productionStage === "Completed") continue;
    // Filter: skip DJ jobs that are in completed stage (if no production record)
    if (!prod && dj.djStage === "Completed") continue;

    result.push(job);
  }

  return result;
}

/**
 * Get active pipeline jobs for a specific territory (by ZIP code match).
 * Uses the territories.ts ZIP_TO_TERRITORY mapping.
 */
export async function getJobsForTerritory(territoryId: TerritoryId): Promise<PipelineJob[]> {
  const jobs = await getActivePipelineJobs();
  return jobs.filter((job) => {
    const terr = getTerritoryByZip(job.zip);
    return terr?.id === territoryId;
  });
}

/**
 * Get active pipeline jobs assigned to a specific PM (by Airtable People record ID).
 * Includes both jobs where pmId matches AND DJActiveJobs where pmName maps to that PM.
 */
export async function getJobsForPm(pmRecordId: string): Promise<PipelineJob[]> {
  const jobs = await getActivePipelineJobs();
  return jobs.filter((job) => job.pmId === pmRecordId);
}

/**
 * Compute territory stats from active pipeline jobs.
 * Returns stats for all 4 territories.
 */
export async function getTerritoryStats(): Promise<TerritoryStats[]> {
  const jobs = await getActivePipelineJobs();
  const thisWeek = getWeekRange(0);
  const nextWeek = getWeekRange(1);

  const stats: TerritoryStats[] = [];

  for (const [, territory] of Object.entries(TERRITORIES)) {
    if (!territory.active) continue;

    const territoryJobs = jobs.filter((job) => getTerritoryByZip(job.zip)?.id === territory.id);

    let totalRevenue = 0;
    let totalBudgetedHours = 0;
    let activeJobs = 0;
    let pendingScheduleJobs = 0;
    let inProgressJobs = 0;
    let scheduledJobs = 0;
    let unscheduledJobs = 0;
    let jobsThisWeek = 0;
    let jobsNextWeek = 0;

    for (const job of territoryJobs) {
      activeJobs++;

      if (job.productionStage === "Pending Schedule") {
        pendingScheduleJobs++;
        if (!job.startDate) unscheduledJobs++;
      }
      if (job.productionStage === "In Progress") inProgressJobs++;
      if (job.productionStage === "Scheduled") scheduledJobs++;

      if (job.value) totalRevenue += job.value;
      if (job.estimatedHours) totalBudgetedHours += job.estimatedHours;

      if (job.startDate && job.startDate >= thisWeek.start && job.startDate <= thisWeek.end) {
        jobsThisWeek++;
      }
      if (job.startDate && job.startDate >= nextWeek.start && job.startDate <= nextWeek.end) {
        jobsNextWeek++;
      }
    }

    // Calculate overload status: healthy < 200h, busy < 350h, overloaded >= 350h (per week)
    let overloadStatus: "healthy" | "busy" | "overloaded" = "healthy";
    const weeklyHours = totalBudgetedHours / 4; // rough estimate
    if (weeklyHours >= 350) overloadStatus = "overloaded";
    else if (weeklyHours >= 200) overloadStatus = "busy";

    stats.push({
      territory,
      activeJobs,
      pendingScheduleJobs,
      inProgressJobs,
      scheduledJobs,
      totalRevenue,
      totalBudgetedHours,
      unscheduledJobs,
      jobsThisWeek,
      jobsNextWeek,
      overloadStatus,
    });
  }

  return stats;
}

/**
 * PM workload and performance stats
 */
export interface PmStats {
  pmEmail: string;
  pmName: string;
  pmRecordId: string | null;
  activeJobs: number;
  pendingScheduleJobs: number;
  inProgressJobs: number;
  scheduledJobs: number;
  totalRevenue: number;
  totalBudgetedHours: number;
  jobsThisWeek: number;
  jobsNextWeek: number;
  missingColorJobs: number;
  missingMaterialJobs: number;
  missingCrewJobs: number;
  unscheduledJobs: number;
  jobsOutsidePrimaryTerritory: number;
  overloadStatus: "healthy" | "busy" | "overloaded";
  territories: string[];
}

/**
 * Compute PM workload stats from active pipeline jobs.
 */
export async function getPmStats(): Promise<PmStats[]> {
  const jobs = await getActivePipelineJobs();
  const thisWeek = getWeekRange(0);
  const nextWeek = getWeekRange(1);

  // Build map of PM record ID → (name, email) — confirmed from live Airtable People table
  const pmInfo = new Map<string, { name: string; email: string }>();
  pmInfo.set("recIWuHhrhcJvOCIM", { name: "Nico Lawler",     email: "nico@provisionpaints.com" });
  pmInfo.set("recsAsvt9rVtOdN7w", { name: "Tyler Grodivant", email: "tyler@provisionpaints.com" });
  pmInfo.set("recAliPlaceholder0001", { name: "Ali Ubeda Jr", email: "ali@provisionpaints.com" }); // TODO: confirm real People record ID
  pmInfo.set("recBDt9RI3r4k4H7e", { name: "Colin Colby",     email: "colin@provisionpaints.com" }); // Left company but still has active jobs
  pmInfo.set("reco9oLBCchHcTW1u", { name: "Jacob Wright",    email: "jacob@provisionpaints.com" });

  // Group jobs by PM
  const jobsByPm = new Map<string, PipelineJob[]>();
  for (const job of jobs) {
    const pmId = job.pmId || "unknown";
    if (!jobsByPm.has(pmId)) jobsByPm.set(pmId, []);
    jobsByPm.get(pmId)!.push(job);
  }

  const stats: PmStats[] = [];

  for (const [pmId, pmJobs] of jobsByPm) {
    const info = pmInfo.get(pmId);
    if (!info) continue; // Skip unknown PMs

    let activeJobs = 0;
    let pendingScheduleJobs = 0;
    let inProgressJobs = 0;
    let scheduledJobs = 0;
    let totalRevenue = 0;
    let totalBudgetedHours = 0;
    let jobsThisWeek = 0;
    let jobsNextWeek = 0;
    let missingColorJobs = 0;
    let missingMaterialJobs = 0;
    let missingCrewJobs = 0;
    let unscheduledJobs = 0;
    const territoriesSet = new Set<string>();
    let jobsOutsidePrimaryTerritory = 0;

    for (const job of pmJobs) {
      activeJobs++;

      if (job.productionStage === "Pending Schedule") {
        pendingScheduleJobs++;
        if (!job.startDate) unscheduledJobs++;
      }
      if (job.productionStage === "In Progress") inProgressJobs++;
      if (job.productionStage === "Scheduled") scheduledJobs++;

      if (job.value) totalRevenue += job.value;
      if (job.estimatedHours) totalBudgetedHours += job.estimatedHours;

      if (job.startDate && job.startDate >= thisWeek.start && job.startDate <= thisWeek.end) {
        jobsThisWeek++;
      }
      if (job.startDate && job.startDate >= nextWeek.start && job.startDate <= nextWeek.end) {
        jobsNextWeek++;
      }

      if (job.colorStatus === "Not Started") missingColorJobs++;
      if (job.materialStatus === "Not Ordered" || job.materialStatus === "Backordered") {
        missingMaterialJobs++;
      }
      if (!job.crew && (job.productionStage === "Scheduled" || job.productionStage === "In Progress")) {
        missingCrewJobs++;
      }

      const terr = getTerritoryByZip(job.zip);
      if (terr) {
        territoriesSet.add(terr.name);
        // Count jobs outside primary territory (rough heuristic: compare to first territory)
        if (territoriesSet.size > 1) jobsOutsidePrimaryTerritory++;
      }
    }

    // overloadStatus: healthy < 40h budgetedHours, busy < 60h, overloaded >= 60h
    let overloadStatus: "healthy" | "busy" | "overloaded" = "healthy";
    if (totalBudgetedHours >= 60) overloadStatus = "overloaded";
    else if (totalBudgetedHours >= 40) overloadStatus = "busy";

    stats.push({
      pmEmail: info.email,
      pmName: info.name,
      pmRecordId: pmId,
      activeJobs,
      pendingScheduleJobs,
      inProgressJobs,
      scheduledJobs,
      totalRevenue,
      totalBudgetedHours,
      jobsThisWeek,
      jobsNextWeek,
      missingColorJobs,
      missingMaterialJobs,
      missingCrewJobs,
      unscheduledJobs,
      jobsOutsidePrimaryTerritory,
      overloadStatus,
      territories: Array.from(territoriesSet),
    });
  }

  return stats;
}
