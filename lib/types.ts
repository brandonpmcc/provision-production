// Shared types for the Production app
import type { TerritoryId } from "./territories";

export type DealStage =
  | "Project Pending Schedule"
  | "Project Scheduled"          // Deal has been scheduled in production
  | "Project In Progress"
  | "Project Complete"
  | "RES Pending Payment"
  | "Projects On Hold"
  | "Canceled Jobs";

export type ProductionStage =
  | "Pending Schedule"
  | "Needs Confirmation"
  | "Scheduled"
  | "Materials Needed"
  | "Ready to Start"
  | "In Progress"
  | "Final Walkthrough"
  | "Pending Payment"
  | "Completed";

export type Trade =
  | "Painting"
  | "Siding"
  | "Gutters"
  | "Carpentry"
  | "Commercial"
  | "Pressure Washing"
  | "Drywall";

export type Zone =
  | "Jacksonville Beach"
  | "Ponte Vedra"
  | "Nocatee"
  | "St. Augustine"
  | "Mandarin"
  | "Riverside/Avondale"
  | "Northside"
  | "Orange Park"
  | "Fernandina/Amelia"
  | "Anywhere";

export interface Deal {
  id: string;
  name: string;
  stage: DealStage | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  projectType: string | null;
  pmId: string | null;
  value: number | null;
  budgetedHours: number | null;
  contactId: string | null;
  productionId: string | null;
}

export interface ProductionJob {
  id: string;
  job: string;
  dealId: string | null;
  stage: ProductionStage | null;
  pmId: string | null;
  crew: string | null;
  crew2: string | null;
  startDate: string | null;
  endDate: string | null;
  customerConfirmedStart: boolean;
  crewConfirmed: boolean;
  colorSelectionComplete: boolean;
  colorStatus: "Not Started" | "In Progress" | "Complete" | null;
  materialsOrdered: boolean;
  materialsReceived: boolean;
  materialStatus: "Not Ordered" | "Ordered" | "Received" | "Backordered" | null;
  specialMaterialsWarning: string | null;
  siteWalkComplete: boolean;
  companyCamUrl: string | null;
  companyCamProjectId: string | null;
  notes: string | null;
  // Crew scoring (entered by Miriam/Jacob after job completion)
  scoreOnTime: number | null;       // 1–5 rating
  scoreCustomerSat: number | null;  // 1–5 rating
  scoreCommunication: number | null; // 1–5 rating
  scoreAvg: number | null;          // computed by Airtable formula
  scoreNotes: string | null;
  scoreDate: string | null;
  // Reminder sent dates (set when Miriam marks a reminder as sent)
  reminder14daySent: string | null; // date string "YYYY-MM-DD" or null
  reminder7daySent: string | null;
  reminder3daySent: string | null;
  reminder1daySent: string | null;
}

/** Customer contact record from Airtable Contacts table */
export interface Contact {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
}

export interface Crew {
  id: string;
  name: string;
  color: string | null;
  trades: Trade[];
  coverageAreas: Zone[];
  leadContactName: string | null;
  leadContactPhone: string | null;
  inHouse: boolean;
  active: boolean;
}

/** Aggregated per-crew health stats, computed in the app layer */
export interface CrewHealth {
  crewName: string;
  color: string | null;
  totalJobs: number;
  scoredJobs: number;
  avgOnTime: number | null;
  avgCustomerSat: number | null;
  avgCommunication: number | null;
  avgOverall: number | null;
  activeJobs: number;
  scheduledHours: number;  // sum of budgeted hours for current/upcoming jobs
}

export interface MonthlyGoal {
  id: string;
  period: string; // "May 2026"
  month: string;
  monthNumber: number;
  year: number;
  productionGoal: number | null;
  revenueGoal: number | null;
  salesGoal: number | null;
  jobsProducedGoal: number | null;
  avgJobSizeGoal: number | null;
  laborBudget: number | null;
  materialBudget: number | null;
  actualProduction: number | null;
  actualRevenue: number | null;
}

export interface Person {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
}

/**
 * A raw active job from the DripJobs (DJ Jobs) table — Scheduled or Pending stage.
 * This is the authoritative source for "what jobs are currently active."
 */
export interface DJActiveJob {
  id: string;            // Airtable DJ Job record ID
  jobId: string | null;  // DripJobs internal job ID string
  customer: string;
  address: string;
  zip: string;
  city: string;
  state: string;
  projectType: string | null; // from linked Deal
  pmName: string | null; // PM full name as text from DripJobs
  pmId: string | null;   // Airtable People record ID (derived from pmName)
  revenue: number | null;
  estLaborHours: number | null;
  estLaborCost: number | null;   // Estimated labor cost from DripJobs
  estMaterials: number | null;   // Estimated material cost from DripJobs
  djStage: string | null; // "Scheduled" | "Pending" | "Accepted"
  dealId: string | null;  // linked Airtable Deal record ID (if matched)
  customerId: string | null;       // DripJobs Customer ID — used to look up contact info
  dealStage: string | null;        // Deal's "Current Stage" from Airtable — source of truth for production stage
  scrapedAt: string | null;
  // Enriched from Contacts table via Customer ID match
  customerPhone: string | null;
  customerEmail: string | null;
  customerContactName: string | null;
}

/**
 * A slimmed-down, serializable job record passed to the MapClient.
 * Built server-side from merged DJActiveJob + Production records.
 */
export interface MapJob {
  id: string;
  name: string;
  address: string;
  zip: string;
  city: string;
  projectType: string | null;
  pmName: string | null;
  value: number | null;
  productionStage: string;
  crew: string | null;
  startDate: string | null;
  endDate: string | null;
  isActivated: boolean;
  territoryId?: TerritoryId;
}

/**
 * Unified pipeline job — merges a DJActiveJob with its Production record (if one exists).
 * This is what the PipelineBoard renders.
 */
export interface PipelineJob {
  // Identity
  id: string;             // Production record ID if activated, else DJ Job ID
  djJobId: string;
  dealId: string | null;
  isActivated: boolean;   // true if a Production record exists

  // Customer info (from DJ Job + linked Deal + Contacts)
  name: string;
  address: string;
  zip: string;
  city: string;
  state: string;
  projectType: string | null;
  value: number | null;
  estimatedHours: number | null;
  estimatedLaborCost: number | null;   // From DripJobs Est Labor Cost
  estimatedMaterials: number | null;   // From DripJobs Est Materials
  pmName: string | null;
  pmId: string | null;
  // Contact enrichment — phone/email from Contacts table via Customer ID match
  customerPhone: string | null;
  customerEmail: string | null;
  customerContactName: string | null;

  // Production pipeline state (from Production record, defaults if not activated)
  productionStage: ProductionStage;

  // Production record fields (null/false if not activated)
  crew: string | null;
  crew2: string | null;
  startDate: string | null;
  endDate: string | null;
  customerConfirmedStart: boolean;
  crewConfirmed: boolean;
  colorStatus: "Not Started" | "In Progress" | "Complete" | null;
  materialStatus: "Not Ordered" | "Ordered" | "Received" | "Backordered" | null;
  specialMaterialsWarning: string | null;
  siteWalkComplete: boolean;
  companyCamUrl: string | null;
  notes: string | null;
  scoreAvg: number | null;

  // Territory assignment
  territoryId?: TerritoryId;
  territoryName?: string;
}

/**
 * Scheduling readiness status for a job
 */
export type SchedulingReadiness =
  | "ready"
  | "missing-colors"
  | "missing-materials"
  | "missing-crew"
  | "missing-deposit"
  | "needs-customer-confirmation"
  | "needs-review"
  | "on-hold"
  | "missing-info";

/**
 * AI-generated suggestion for scheduling a job to a PM and time period
 */
export interface SchedulerSuggestion {
  jobId: string;
  suggestedPmEmail: string | null;
  suggestedPmName: string | null;
  suggestedStartDate: string | null;    // YYYY-MM-DD
  suggestedEndDate: string | null;      // YYYY-MM-DD
  territoryId: TerritoryId;
  territoryName: string;
  pmScore: number;                       // 0-100
  pmScoreReason: string;
  schedulingReadiness: SchedulingReadiness;
  missingItems: string[];
  blockingItems: string[];
  explanation: string;                   // Human-readable full explanation
}

/**
 * PM capacity constraints and territory assignments
 */
export interface PMCapacity {
  pmEmail: string;
  pmName: string;
  pmRecordId: string | null;
  territories: TerritoryId[];           // primary territories
  backupTerritories: TerritoryId[];     // backup for overflow
  maxBudgetedHoursPerWeek: number;      // default 55
  maxActiveJobs: number;                // default 15
  active: boolean;
}
