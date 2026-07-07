// ProVision Painting territories - Jacksonville, FL area
// Territory data comes from real map of service areas

export type TerritoryId = "north" | "central" | "south" | "south-expansion" | "unknown";

export interface Territory {
    id: TerritoryId;
    name: string;
    description: string;
    color: string;
    colorLight: string;
    zipCodes: string[];
    communities: string[];
    boundary: string;
    primaryPmEmail: string | null;
    backupPmEmail: string | null;
    active: boolean;
    notes: string;
}

export interface TerritoryStats {
    territory: Territory;
    activeJobs: number;
    pendingScheduleJobs: number;
    inProgressJobs: number;
    scheduledJobs: number;
    totalRevenue: number;
    totalBudgetedHours: number;
    unscheduledJobs: number;
    jobsThisWeek: number;
    jobsNextWeek: number;
    overloadStatus: "healthy" | "busy" | "overloaded";
}

const NORTH: Territory = {
    id: "north",
    name: "NORTH",
    description: "North of Atlantic Blvd",
    color: "#3b82f6",
    colorLight: "#dbeafe",
    zipCodes: ["32034", "32097", "32218", "32219", "32220", "32226", "32277", "32225", "32233"],
    communities: ["Fernandina Beach","Yulee","Airport/North Jacksonville","NW Jacksonville","Westside North","Oceanway/Northside","Arlington North","East Arlington (Split)","Atlantic Beach"],
    boundary: "North of Atlantic Blvd (bottom of Atlantic Beach)",
    primaryPmEmail: null,
    backupPmEmail: null,
    active: true,
    notes: ""
};

const CENTRAL: Territory = {
    id: "central",
    name: "CENTRAL",
    description: "Atlantic Blvd to Mickler Landing Rd / Palm Valley Rd",
    color: "#22c55e",
    colorLight: "#dcfce7",
    zipCodes: ["32202","32204","32205","32206","32207","32208","32209","32210","32211","32216","32217","32224","32236","32246","32250","32256","32266"],
    communities: ["Downtown","Riverside","Avondale/Murray Hill","Springfield","San Marco","Urban Northside","NW Urban Core","Westside","Arlington (Split)","Southside","Baymeadows North","Intracoastal/Beach Blvd (Split)","Neptune Beach (32236)","Tinseltown/Gate Pkwy","Jacksonville Beach (Split)","Deerwood/Butler Blvd","Neptune Beach (32266)"],
    boundary: "Atlantic Blvd to Mickler Landing Rd / Palm Valley Rd",
    primaryPmEmail: null,
    backupPmEmail: null,
    active: true,
    notes: ""
};

const SOUTH: Territory = {
    id: "south",
    name: "SOUTH",
    description: "Mickler Landing Rd / Palm Valley Rd to US 16",
    color: "#f59e0b",
    colorLight: "#fef3c7",
    zipCodes: ["32081","32082","32223","32257","32258","32259","32092","32095"],
    communities: ["Nocatee","Ponte Vedra Beach (Split)","Mandarin","Mandarin/Baymeadows South","Bartram Park","St. Johns/Julington Creek","World Golf Village","North St. Augustine"],
    boundary: "Mickler Landing Rd / Palm Valley Rd to US 16",
    primaryPmEmail: null,
    backupPmEmail: null,
    active: true,
    notes: ""
};

const SOUTH_EXPANSION: Territory = {
    id: "south-expansion",
    name: "SOUTH EXPANSION",
    description: "South of US 16",
    color: "#ef4444",
    colorLight: "#fee2e2",
    zipCodes: ["32080","32084","32086","32137","32164","32136","32110"],
    communities: ["St. Augustine Beach/Anastasia Island","St. Augustine","St. Augustine South","Palm Coast North","Palm Coast Central","Palm Coast East","Bunnell/Palm Coast West"],
    boundary: "South of US 16",
    primaryPmEmail: null,
    backupPmEmail: null,
    active: true,
    notes: ""
};

const UNKNOWN: Territory = {
    id: "unknown",
    name: "UNKNOWN",
    description: "Unassigned/unmatched territory",
    color: "#6b7280",
    colorLight: "#f3f4f6",
    zipCodes: [],
    communities: [],
    boundary: "No matching boundary",
    primaryPmEmail: null,
    backupPmEmail: null,
    active: false,
    notes: "Used for jobs that don't match a specific territory"
};

export const TERRITORIES: Record<TerritoryId, Territory> = {
    north: NORTH,
    central: CENTRAL,
    south: SOUTH,
    "south-expansion": SOUTH_EXPANSION,
    unknown: UNKNOWN
};

export const ZIP_TO_TERRITORY: Record<string, TerritoryId> = {
    "32034":"north","32097":"north","32218":"north","32219":"north","32220":"north","32226":"north","32277":"north","32225":"north","32233":"north",
    "32202":"central","32204":"central","32205":"central","32206":"central","32207":"central","32208":"central","32209":"central","32210":"central","32211":"central","32216":"central","32217":"central","32224":"central","32236":"central","32246":"central","32250":"central","32256":"central","32266":"central",
    "32081":"south","32082":"south","32223":"south","32257":"south","32258":"south","32259":"south","32092":"south","32095":"south",
    "32080":"south-expansion","32084":"south-expansion","32086":"south-expansion","32137":"south-expansion","32164":"south-expansion","32136":"south-expansion","32110":"south-expansion"
};

export function getTerritoryByZip(zip: string): Territory | null {
    const territoryId = ZIP_TO_TERRITORY[zip];
    if (!territoryId) return null;
    return TERRITORIES[territoryId] || null;
}

export function getTerritoryByAddress(address: string): Territory | null {
    const zipMatch = address.match(/\b(\d{5})\b/);
    if (!zipMatch || !zipMatch[1]) return null;
    return getTerritoryByZip(zipMatch[1]);
}

export function getTerritoryColor(territoryId: TerritoryId): string {
    return TERRITORIES[territoryId]?.color || "#6b7280";
}

export function getTerritoryColorLight(territoryId: TerritoryId): string {
    return TERRITORIES[territoryId]?.colorLight || "#f3f4f6";
}
