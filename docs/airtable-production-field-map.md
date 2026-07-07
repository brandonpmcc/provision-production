# Airtable Production Field Map
## ProVision Painting — Production App

> **Last Updated:** July 2026  
> **Base ID:** `appHvFXShVSNjLCrG`  
> **Purpose:** Documents all Airtable tables, views, and fields used by the Production App, including field IDs, data types, and mapping to app variables.

---

## Tables Overview

| Table Name | Table ID | Primary Use |
|-----------|---------|------------|
| Deals | `tblUhWSbH6r1nAC1h` | Source of truth for jobs (customer, address, revenue, PM) |
| Production | `tblsAq6MisZKzwqEG` | Production tracking (stage, crew, dates, confirmations) |
| DJ Jobs | `tblYf9VDwY40hP0qE` | DripJobs work orders (synced via Zapier) |
| Crews | `tblv65HTsbzDYxBLB` | Subcontractor/crew management |
| People | `tblOZSeJ7T8gVwn6C` | Staff (PMs, coordinators, managers) |
| Contacts | `tblQ2uyUiZEqRjGKm` | Customer contact information |
| GBC Monthly Performance | `tbla1KWFdqizh7qjU` | Monthly production goals and actuals |

---

## Table: Deals (`tblUhWSbH6r1nAC1h`)

**View Used:** Default (all records, filtered by `Current Stage`)

| Airtable Field Name | Field ID | App Variable | Data Type | Required | Notes |
|--------------------|---------|-------------|----------|---------|-------|
| Deal Name | `fld7l3y1V03XuO67W` | `name` | Text | Yes | Customer/job name |
| Current Stage | `fldAbKuo2dxR6D0MW` | `stage` | Single Select | Yes | See Deal Stages below |
| Deal Address | `fldy5spsL1wBJffW7` | `address` | Text | Yes | Street address |
| Deal City | `fld8LcLG34aFpFGti` | `city` | Text | Yes | City |
| Deal State | `fldMlMvA92xJon5p8` | `state` | Text | Yes | State (FL) |
| Deal Zip | `fldNNj3auNLlDp3B3` | `zip` | Text | Yes | ZIP code — used for territory assignment |
| Project Type | `fldmEFRe7DYSyvCaS` | `projectType` | Single Select | No | Painting, Siding, Gutters, etc. |
| PM | `fldZWqrlRrmryVuCE` | `pmId` | Linked (People) | No | Project Manager assignment |
| Value: Deal | `fld2po4ZL8FOH1YUO` | `value` | Currency | Yes | Contract amount |
| Budgeted Hours | `fldZGi3kdeWN2PANH` | `budgetedHours` | Number | No | Estimated labor hours |
| Contact | `fldx5LGh2INrvIPYO` | `contactId` | Linked (Contacts) | No | Customer contact record |
| Production | `fldSsBAzj4oFMXer4` | `productionId` | Linked (Production) | No | Reverse link to Production record |

### Deal Stages (Current Stage field options):
| Stage Value | App Status | Show in Production? |
|------------|-----------|-------------------|
| Project Pending Schedule | `Pending Schedule` | ✅ Yes |
| Project In Progress | `In Progress` | ✅ Yes |
| Project Complete | `Completed` | ❌ No — filter out |
| RES Pending Payment | `Pending Payment` | ✅ Yes |
| Projects On Hold | `On Hold` | ✅ Yes (with flag) |
| Canceled Jobs | `Cancelled` | ❌ No — filter out |

---

## Table: Production (`tblsAq6MisZKzwqEG`)

**Purpose:** Production-specific data linked to each Deal. Created when a job is "activated" from the Pipeline.

| Airtable Field Name | Field ID | App Variable | Data Type | Required | Notes |
|--------------------|---------|-------------|----------|---------|-------|
| Job | `fldRB9ES4mT1Yzc9N` | `job` | Text | Yes | Job label (usually customer name) |
| Deal | `flduw6T35kZfoAH7d` | `dealId` | Linked (Deals) | Yes | Links back to the Deal |
| Production Stage | `fldZFaZaEyQC2422a` | `stage` | Single Select | Yes | See Production Stages below |
| PM | `fldX1xapsvRaHjnsg` | `pmId` | Linked (People) | No | PM override in Production |
| Crew | `fldVDFtV9RqpHDaQd` | `crew` | Text | No | Primary crew name |
| Crew 2 (Split Job) | `fldBKNX1iT6Jc1uZx` | `crew2` | Text | No | Secondary crew for split jobs |
| Start Date | `fld1f3JE7GKv3lgK4` | `startDate` | Date | No | Scheduled start date |
| End Date | `fldxPuqbfO9lQ7aE8` | `endDate` | Date | No | Scheduled end date |
| Customer Confirmed Start | `fldR3ummy81wN9rpR` | `customerConfirmedStart` | Checkbox | No | Customer confirmed the start date |
| Crew Confirmed | `fldnJlA7p2GVAiUi6` | `crewConfirmed` | Checkbox | No | Crew confirmed they're ready |
| Color Selection Complete | `fldjrrE5ITdVHht9j` | `colorSelectionComplete` | Checkbox | No | Colors finalized |
| Color Status | `fldZmYBXOZCMDHLNn` | `colorStatus` | Single Select | No | Not Started / In Progress / Complete |
| Materials Ordered | `fldwnbG6QhqD1TvjK` | `materialsOrdered` | Checkbox | No | Materials have been ordered |
| Materials Received | `flddBq4f18AQvLHpm` | `materialsReceived` | Checkbox | No | Materials arrived on site |
| Material Status | `fldTwHtDCdeELgdpR` | `materialStatus` | Single Select | No | Not Ordered / Ordered / Received / Backordered |
| Special Materials Warning | `fldr8KF2JGEcnvAcd` | `specialMaterialsWarning` | Long Text | No | Notes about unusual materials |
| Site Walk Complete | `fld2OtXXEsfOruVRO` | `siteWalkComplete` | Checkbox | No | Pre-job site walk done |
| CompanyCam Project URL | `fldsB2sq7bnXpS2UP` | `companyCamUrl` | URL | No | Link to CompanyCam project |
| CompanyCam Project ID | `fldPziYjmx33Y3e8t` | `companyCamProjectId` | Text | No | CompanyCam internal ID |
| Notes | `fld7pYDflo8qcgqJm` | `notes` | Long Text | No | Internal production notes |
| Score: On-Time | `fldqHQrRLKt19ewgo` | `scoreOnTime` | Rating (1-5) | No | Post-completion crew score |
| Score: Customer Satisfaction | `fldhPxxTSTKoH92f1` | `scoreCustomerSat` | Rating (1-5) | No | Post-completion crew score |
| Score: Communication | `fldqnkAfK4Z91KJad` | `scoreCommunication` | Rating (1-5) | No | Post-completion crew score |
| Crew Score Avg | `fldiOuVePNvccUEsZ` | `scoreAvg` | Formula | No | Auto-computed average of 3 scores |
| Score Notes | `fldUa6lfNxfPoaFdI` | `scoreNotes` | Long Text | No | Notes with crew score |
| Score Date | `fldbj5RiFYhoz9HAZ` | `scoreDate` | Date | No | Date score was entered |
| Reminder 14-Day Sent | `fldi91gXI5qNX4m7d` | `reminder14daySent` | Date | No | Date 14-day reminder was sent |
| Reminder 7-Day Sent | `fldOE3dQx3lt3tf8G` | `reminder7daySent` | Date | No | Date 7-day reminder was sent |
| Reminder 3-Day Sent | `fldmoNQImrKnR1EXg` | `reminder3daySent` | Date | No | Date 3-day reminder was sent |
| Reminder 1-Day Sent | `fldzaTwKMA6Tkwn5g` | `reminder1daySent` | Date | No | Date 1-day reminder was sent |

### Production Stages:
| Stage | Show in Active Dashboard | Description |
|-------|------------------------|-------------|
| Pending Schedule | ✅ Yes | Needs scheduling — **main queue** |
| Needs Confirmation | ✅ Yes | Waiting for customer/crew confirmation |
| Scheduled | ✅ Yes | Dates set, not started |
| Materials Needed | ✅ Yes | Waiting on materials |
| Ready to Start | ✅ Yes | All clear, start imminent |
| In Progress | ✅ Yes | Work currently underway |
| Final Walkthrough | ✅ Yes | Near completion |
| Pending Payment | ✅ Yes | Work done, awaiting payment |
| Completed | ❌ **Filter out** | Job is done — hide from main dashboard |

> **Important:** `Completed` jobs must be filtered from the main Production Dashboard. They remain in Airtable for history but should not appear in live scheduling views.

---

## Table: DJ Jobs (`tblYf9VDwY40hP0qE`)

**Purpose:** DripJobs work orders scraped and synced via Zapier. Primary source for active jobs entering the pipeline.

| Airtable Field Name | Field ID | App Variable | Data Type | Required | Notes |
|--------------------|---------|-------------|----------|---------|-------|
| Job ID | `fld2RsycXvOSmLtPl` | `jobId` | Text | Yes | DripJobs internal ID |
| Customer | `fldbq2MMj43IgrwKY` | `customer` | Text | Yes | Customer name |
| Address | `fldwOn9YbD8YCHWn9` | `address` | Text | No | Job address |
| Project Manager | `fldW3mUMGvGp6cxsT` | `pmName` | Text | No | PM name (text, not linked) |
| Revenue | `fldyrqzIII72ujX69` | `revenue` | Currency | No | Job contract value |
| Est Labor Hours | `fldIIpgJhWVn9i7KJ` | `estLaborHours` | Number | No | Estimated hours from DripJobs |
| Job Stage | `fldQcJxNxKYT1Y1va` | `djStage` | Single Select | Yes | "Scheduled" or "Pending" (active stages) |
| Deal | `fldLld2My3Gsq67OR` | `dealId` | Linked (Deals) | No | Linked Deal record |
| Scraped At | `fldlJebpGZl2P6R8A` | `scrapedAt` | DateTime | No | When the record was last synced |

### DJ Job Stages Included in Production:
- `"Scheduled"` — Job is scheduled in DripJobs
- `"Pending"` — Job is pending in DripJobs

### DJ Job Stages Excluded:
- `"Completed"` — Filter out from active pipeline
- `"Cancelled"` — Filter out from active pipeline
- Any other terminal states

---

## Table: Crews (`tblv65HTsbzDYxBLB`)

**Purpose:** Subcontractor crew management. Used for crew assignment, scheduling, and capacity.

| Airtable Field Name | Field ID | App Variable | Data Type | Required | Notes |
|--------------------|---------|-------------|----------|---------|-------|
| Crew Name | `fldBZk3YNkfRFIEvI` | `name` | Text | Yes | Crew identifier |
| Color | `fld1DtKgzfw1LuS4a` | `color` | Single Select | No | Color for map/UI display |
| Trades | `fldpFfT4H6KYdA1Im` | `trades` | Multi Select | No | Painting, Siding, Gutters, etc. |
| Coverage Areas | `fld6ZNVQ3ZtsCVmvl` | `coverageAreas` | Multi Select | No | Zone names covered by this crew |
| Lead Contact Name | `fldQ1WcYFdhiXa0sE` | `leadContactName` | Text | No | Lead person's name |
| Lead Contact Phone | `fld8a85OQchUCuEYf` | `leadContactPhone` | Phone | No | Lead person's phone |
| In-House | `fld2RiEQCJ9kwGlwc` | `inHouse` | Checkbox | No | True = ProVision employee team |
| Active | `fld1keDQc1GcPlS0J` | `active` | Checkbox | Yes | Filter: only show active crews |
| Notes | `fldGvlLhKF3KYXkAa` | `notes` | Long Text | No | Crew notes |

---

## Table: People (`tblOZSeJ7T8gVwn6C`)

**Purpose:** Staff directory. PMs, coordinators, and managers.

| Airtable Field Name | App Variable | Data Type | Notes |
|--------------------|-------------|----------|-------|
| Name | `name` | Text | Full name |
| Role | `role` | Single Select | PC (Production Coordinator), PM (Project Manager), etc. |
| Email | `email` | Email | Used for auth mapping |

### Known PM Record IDs:
| PM Name | Record ID | Email |
|---------|----------|-------|
| Nico Lawler | `recIWuHhrhcJvOCIM` | nico@provisionpaints.com |
| Tyler Grodivant | `recsAsvt9rVtOdN7w` | tyler@provisionpaints.com |
| Ali (TBD) | `recAliPlaceholder0001` | ali@provisionpaints.com |

---

## Table: Contacts (`tblQ2uyUiZEqRjGKm`)

**Purpose:** Customer contact records. Linked from Deals.

| Airtable Field Name | Field ID | App Variable | Data Type |
|--------------------|---------|-------------|----------|
| Contact Name | `fldnzyWKk6owKZIkq` | `name` | Text |
| Email | `fldWeiPkkdjq0K5oo` | `email` | Email |
| Phone | `fldqpucfatEmYJt1I` | `phone` | Phone |

---

## Table: GBC Monthly Performance (`tbla1KWFdqizh7qjU`)

**Purpose:** Monthly production goals and actuals. Used for Dashboard and Manager metrics.

| Airtable Field Name | Field ID | App Variable | Data Type |
|--------------------|---------|-------------|----------|
| Period | — | `period` | Text (e.g. "June 2026") |
| Month | `fldWmLopACTYDvraa` | `month` | Single Select |
| Month # | `fldp3YzxxazkHXZs0` | `monthNumber` | Number |
| Year | `fldRUXVvziQX96TDQ` | `year` | Number |
| Monthly Production Goal | `fldGp2D2N1VwZUsLx` | `productionGoal` | Currency |
| Monthly Revenue Goal | `fldylqnTzJBkGFPbp` | `revenueGoal` | Currency |
| Monthly Sales Goal | `fldMKxFu2r9hsbmkN` | `salesGoal` | Currency |
| Jobs Produced Goal | `flds0DyS5XFJqicNM` | `jobsProducedGoal` | Number |
| Average Job Size Goal | `fld4i65maptltrBLS` | `avgJobSizeGoal` | Currency |
| Labor Cost Budget | `fldiTDyhak0d3iels` | `laborBudget` | Currency |
| Material Cost Budget | `fldnSDuAjDefkZ4pU` | `materialBudget` | Currency |
| Actual Production | `fldGRuYFPsvfQ8Vkr` | `actualProduction` | Currency |
| Actual Revenue | `fldS0LpuWSXNEgkMH` | `actualRevenue` | Currency |

---

## Territory ZIP Code Reference

Based on ProVision Painting's 4 PM Territory map (Jacksonville, FL region):

| Territory | ID | Color | ZIP Codes |
|-----------|-----|-------|----------|
| North | `north` | Blue (#3b82f6) | 32034, 32097, 32218, 32219, 32220, 32225, 32226, 32233, 32277 |
| Central | `central` | Green (#22c55e) | 32202, 32204, 32205, 32206, 32207, 32208, 32209, 32210, 32211, 32216, 32217, 32224, 32236, 32246, 32250, 32256, 32266 |
| South | `south` | Amber (#f59e0b) | 32081, 32082, 32092, 32095, 32223, 32257, 32258, 32259 |
| South Expansion | `south-expansion` | Red (#ef4444) | 32080, 32084, 32086, 32110, 32136, 32137, 32164 |

**Territory Boundaries:**
- **North**: North of Atlantic Blvd (bottom of Atlantic Beach)
- **Central**: Atlantic Blvd to Mickler Landing Rd / Palm Valley Rd
- **South**: Mickler Landing Rd / Palm Valley Rd to US 16
- **South Expansion**: South of US 16

---

## Status Normalization Map

The app normalizes raw Airtable stage values to clean production statuses:

| Raw Airtable Value | App Production Stage | Show in Dashboard? |
|-------------------|---------------------|-------------------|
| `Project Pending Schedule` (Deal) | `Pending Schedule` | ✅ |
| `Pending Schedule` (Production) | `Pending Schedule` | ✅ |
| `Needs Confirmation` | `Needs Confirmation` | ✅ |
| `Scheduled` | `Scheduled` | ✅ |
| `Materials Needed` | `Materials Needed` | ✅ |
| `Ready to Start` | `Ready to Start` | ✅ |
| `Project In Progress` (Deal) | `In Progress` | ✅ |
| `In Progress` (Production) | `In Progress` | ✅ |
| `Final Walkthrough` | `Final Walkthrough` | ✅ |
| `RES Pending Payment` (Deal) | `Pending Payment` | ✅ |
| `Pending Payment` (Production) | `Pending Payment` | ✅ |
| `Completed` | `Completed` | ❌ Filter out |
| `Project Complete` (Deal) | `Completed` | ❌ Filter out |
| `Canceled Jobs` | `Cancelled` | ❌ Filter out |
| `Projects On Hold` | `On Hold` | ✅ (flagged) |

---

## Data Cleanup Issues Identified

| Issue | Field | Table | Impact |
|-------|-------|-------|--------|
| Missing ZIP codes | Deal Zip | Deals | Cannot assign territory — jobs show as "Unknown" territory |
| Missing budgeted hours | Budgeted Hours | Deals / DJ Jobs | Capacity calculations inaccurate |
| Missing revenue | Value: Deal | Deals | Revenue totals incomplete |
| PM not assigned | PM | Deals/Production | Cannot calculate PM workload |
| Blank address | Deal Address | Deals | Territory assignment impossible |
| Conflicting status | Current Stage + Production Stage | Both | Job appears in both active and completed |
| Ali PM record ID | PM | People | `recAliPlaceholder0001` is a placeholder — needs real record ID |
| Contractor logins | — | lib/contractor-auth.ts | Empty — Miriam needs to populate crew emails/PINs |

---

## Notes

1. **Never modify Airtable field IDs** — they are immutable identifiers. Field names can be renamed in Airtable without breaking the app if field IDs are used.
2. **API calls are server-side only** — never expose `AIRTABLE_TOKEN` in client-side code.
3. **Rate limits** — Airtable allows 5 requests/second per base. Batch operations are used where possible.
4. **Field name vs Field ID** — The app uses field NAMES (not IDs) in `filterByFormula` for compatibility with the Airtable formula syntax. Field values are accessed by name from record `fields` object.
5. **Pagination** — All fetch calls use `fetchAll()` which handles offset-based pagination automatically.
6. **No hard deletes** — The app never deletes Airtable records. Completed/cancelled jobs are filtered client-side.
