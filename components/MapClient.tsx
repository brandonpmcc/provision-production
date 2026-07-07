"use client";

import { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Rectangle, Tooltip, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { X, ExternalLink, ChevronDown } from "lucide-react";
import type { Crew, MapJob } from "@/lib/types";
import { TERRITORIES, getTerritoryByZip } from "@/lib/territories";

// ─── Geographic constants ──────────────────────────────────────────────────

/** ZIP code → [lat, lng] centroid for the Jacksonville MSA */
const ZIP_CENTROIDS: Record<string, [number, number]> = {
  "32250": [30.2752, -81.3998], // Jacksonville Beach
  "32233": [30.3321, -81.3968], // Atlantic Beach
  "32266": [30.3107, -81.4010], // Neptune Beach
  "32082": [30.2387, -81.3876], // Ponte Vedra Beach
  "32081": [30.1110, -81.4017], // Nocatee
  "32084": [29.8920, -81.3147], // St. Augustine N
  "32086": [29.8300, -81.2896], // St. Augustine S
  "32092": [30.0736, -81.5012], // World Golf Village / St. Johns
  "32095": [30.0168, -81.4022], // St. Augustine NE
  "32097": [30.6340, -81.5927], // Yulee
  "32034": [30.6694, -81.4624], // Fernandina Beach
  "32257": [30.2002, -81.5764], // Mandarin
  "32223": [30.1640, -81.5776], // Mandarin W
  "32258": [30.1425, -81.5593], // Mandarin SE
  "32259": [30.1055, -81.5386], // St. Johns
  "32003": [30.1650, -81.7084], // Green Cove / N Orange Park
  "32073": [30.1744, -81.6881], // Orange Park
  "32065": [30.2117, -81.7441], // Orange Park W
  "32068": [30.0740, -81.8665], // Middleburg
  "32205": [30.3060, -81.6990], // Riverside
  "32204": [30.3244, -81.6851], // Riverside / Avondale N
  "32210": [30.2744, -81.7408], // Westside
  "32244": [30.2354, -81.7274], // Westside
  "32218": [30.4356, -81.6295], // Northside
  "32219": [30.3983, -81.7151], // Northside W
  "32226": [30.4576, -81.5157], // Northside E
  "32256": [30.2106, -81.5423], // Southside
  "32224": [30.2585, -81.4863], // Southside E
  "32225": [30.3165, -81.5198], // Arlington
  "32246": [30.2929, -81.5426], // Southside central
  "32217": [30.2784, -81.6295], // San Marco
  "32207": [30.2953, -81.6381], // San Marco N
};

/** Approximate bounding boxes for Jacksonville-area zones (for crew coverage overlay) */
const ZONE_RECTS: Record<string, [[number, number], [number, number]]> = {
  "Jacksonville Beach": [[30.262, -81.418], [30.295, -81.380]],
  "Atlantic Beach":     [[30.318, -81.414], [30.352, -81.378]],
  "Neptune Beach":      [[30.300, -81.415], [30.322, -81.388]],
  "Ponte Vedra":        [[30.188, -81.448], [30.265, -81.342]],
  "Nocatee":            [[30.082, -81.458], [30.143, -81.360]],
  "St. Augustine":      [[29.812, -81.350], [30.035, -81.245]],
  "St. Johns":          [[30.082, -81.578], [30.148, -81.490]],
  "Mandarin":           [[30.128, -81.622], [30.228, -81.532]],
  "Southside":          [[30.188, -81.590], [30.310, -81.462]],
  "Arlington/Southside":[[30.295, -81.562], [30.352, -81.490]],
  "Riverside/Avondale": [[30.285, -81.728], [30.345, -81.652]],
  "San Marco":          [[30.262, -81.668], [30.315, -81.612]],
  "Northside":          [[30.382, -81.758], [30.495, -81.472]],
  "Westside":           [[30.218, -81.788], [30.295, -81.695]],
  "Orange Park":        [[30.132, -81.792], [30.228, -81.652]],
  "Middleburg":         [[30.042, -81.928], [30.132, -81.818]],
  "Fernandina/Amelia":  [[30.612, -81.510], [30.718, -81.430]],
  "Anywhere":           [[29.750, -82.000], [30.800, -81.200]],
};

/** Zone membership by ZIP — mirrors the map/page.tsx lookup */
const ZONE_BY_ZIP: Record<string, string> = {
  "32250": "Jacksonville Beach",
  "32233": "Atlantic Beach",
  "32266": "Neptune Beach",
  "32082": "Ponte Vedra",
  "32081": "Nocatee",
  "32084": "St. Augustine",
  "32086": "St. Augustine",
  "32092": "St. Augustine",
  "32095": "St. Augustine",
  "32097": "Yulee",
  "32034": "Fernandina/Amelia",
  "32257": "Mandarin",
  "32223": "Mandarin",
  "32258": "Mandarin",
  "32259": "St. Johns",
  "32003": "Orange Park",
  "32073": "Orange Park",
  "32065": "Orange Park",
  "32068": "Middleburg",
  "32205": "Riverside/Avondale",
  "32204": "Riverside/Avondale",
  "32210": "Westside",
  "32244": "Westside",
  "32218": "Northside",
  "32219": "Northside",
  "32226": "Northside",
  "32256": "Southside",
  "32224": "Southside",
  "32225": "Arlington/Southside",
  "32246": "Southside",
  "32217": "San Marco",
  "32207": "San Marco",
};

// ─── Color maps ────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  "Pending Schedule":   "#94a3b8",
  "Needs Confirmation": "#f59e0b",
  "Scheduled":          "#3b82f6",
  "Materials Needed":   "#f97316",
  "Ready to Start":     "#22c55e",
  "In Progress":        "#F57C1F",
  "Final Walkthrough":  "#a855f7",
  "Pending Payment":    "#14b8a6",
  "Completed":          "#15803d",
};

const STAGE_ORDER = [
  "Pending Schedule",
  "Needs Confirmation",
  "Scheduled",
  "Materials Needed",
  "Ready to Start",
  "In Progress",
  "Final Walkthrough",
  "Pending Payment",
  "Completed",
];

/** Map Airtable color names → hex (covers all 22 crew color options) */
const CREW_HEX: Record<string, string> = {
  Red:        "#ef4444",
  Salmon:     "#fb7185",
  Pink:       "#f472b6",
  Tangerine:  "#fb923c",
  Orange:     "#f97316",
  Yellow:     "#eab308",
  Lime:       "#84cc16",
  Green:      "#22c55e",
  Emerald:    "#10b981",
  Teal:       "#14b8a6",
  Cyan:       "#06b6d4",
  Sky:        "#38bdf8",
  Blue:       "#3b82f6",
  Indigo:     "#6366f1",
  Periwinkle: "#818cf8",
  Violet:     "#7c3aed",
  Purple:     "#a855f7",
  Thistle:    "#d8b4fe",
  Lavender:   "#c4b5fd",
  Magenta:    "#e879f9",
  Rose:       "#f43f5e",
  Gray:       "#94a3b8",
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function money(n: number | null | undefined) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

function zoneFor(zip: string) {
  return ZONE_BY_ZIP[zip] || "Other";
}

/** Deterministic jitter per job so stacked pins spread out */
function jitter(id: string): [number, number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  const lat = (((h & 0xff) / 255) - 0.5) * 0.008;
  const lng = ((((h >> 8) & 0xff) / 255) - 0.5) * 0.013;
  return [lat, lng];
}

function crewHex(color: string | null) {
  return color ? CREW_HEX[color] ?? "#94a3b8" : "#94a3b8";
}

// ─── Sub-component: FlyTo controller ──────────────────────────────────────

function FlyTo({ center, zoom }: { center: [number, number] | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom ?? 12, { duration: 0.8 });
  }, [center, zoom, map]);
  return null;
}

// ─── Main component ────────────────────────────────────────────────────────

interface MapClientProps {
  jobs: MapJob[];
  crews: Crew[];
  viewMode?: "zones" | "territories";
}

export default function MapClient({ jobs, crews, viewMode: initialViewMode = "zones" }: MapClientProps) {
  const [colorMode, setColorMode]       = useState<"stage" | "crew">("stage");
  const [stageFilter, setStageFilter]   = useState<string | null>(null);
  const [pmFilter, setPmFilter]         = useState<string | null>(null);
  const [typeFilter, setTypeFilter]     = useState<string | null>(null);
  const [selectedCrew, setSelectedCrew] = useState<string | null>(null);
  const [flyTarget, setFlyTarget]       = useState<{ center: [number, number]; zoom?: number } | null>(null);
  const [selectedJob, setSelectedJob]   = useState<MapJob | null>(null);
  const [viewMode, setViewMode]         = useState<"zones" | "territories">(initialViewMode);

  // Derived lists for filter dropdowns
  const pms = useMemo(() =>
    [...new Set(jobs.map(j => j.pmName).filter((p): p is string => Boolean(p)))].sort(),
    [jobs]
  );
  const types = useMemo(() =>
    [...new Set(jobs.map(j => j.projectType).filter((t): t is string => Boolean(t)))].sort(),
    [jobs]
  );

  // Crew → color lookup
  const crewColorMap = useMemo(() => {
    const m: Record<string, string | null> = {};
    for (const c of crews) m[c.name] = c.color;
    return m;
  }, [crews]);

  // Active coverage zones for selected crew
  const selectedCrewZones = useMemo(() => {
    if (!selectedCrew) return [];
    const c = crews.find(c => c.name === selectedCrew);
    return c?.coverageAreas ?? [];
  }, [selectedCrew, crews]);

  // Filtered jobs
  const filtered = useMemo(() => jobs.filter(j => {
    if (stageFilter && j.productionStage !== stageFilter) return false;
    if (pmFilter && j.pmName !== pmFilter) return false;
    if (typeFilter && j.projectType !== typeFilter) return false;
    return true;
  }), [jobs, stageFilter, pmFilter, typeFilter]);

  // Jobs that can be plotted on the map
  const mappable = useMemo(() =>
    filtered.filter(j => j.zip && ZIP_CENTROIDS[j.zip]),
    [filtered]
  );

  // Zone aggregates for the sidebar (when in zones view)
  const zoneAgg = useMemo(() => {
    const m = new Map<string, { count: number; value: number }>();
    for (const j of filtered) {
      const z = zoneFor(j.zip);
      if (!m.has(z)) m.set(z, { count: 0, value: 0 });
      const d = m.get(z)!;
      d.count++;
      d.value += j.value ?? 0;
    }
    return [...m.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [filtered]);

  // Territory aggregates for the sidebar (when in territories view)
  const territoryAgg = useMemo(() => {
    const m = new Map<string, { count: number; value: number }>();
    for (const j of filtered) {
      const terr = getTerritoryByZip(j.zip);
      const terrName = terr?.name || "Unknown";
      if (!m.has(terrName)) m.set(terrName, { count: 0, value: 0 });
      const d = m.get(terrName)!;
      d.count++;
      d.value += j.value ?? 0;
    }
    return [...m.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [filtered]);

  // Active stages present in filtered data (for legend)
  const activeStages = useMemo(() => {
    const s = new Set(filtered.map(j => j.productionStage));
    return STAGE_ORDER.filter(st => s.has(st));
  }, [filtered]);

  const maxZoneCount = zoneAgg.reduce((m, [, d]) => Math.max(m, d.count), 1);

  const JAX_CENTER: [number, number] = [30.25, -81.55];

  return (
    <div className="flex" style={{ height: "calc(100vh - 3.5rem)", margin: "-1.5rem" }}>

      {/* ── Left sidebar ─────────────────────────────────────────── */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col overflow-hidden flex-shrink-0">

        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 bg-orange-50">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-sm text-gray-800">Geographic View</div>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode("zones")}
                className={`text-xs px-2 py-1 rounded font-medium transition ${
                  viewMode === "zones"
                    ? "bg-white text-orange-600 shadow"
                    : "text-gray-600 hover:bg-white/50"
                }`}
              >
                Zones
              </button>
              <button
                onClick={() => setViewMode("territories")}
                className={`text-xs px-2 py-1 rounded font-medium transition ${
                  viewMode === "territories"
                    ? "bg-white text-orange-600 shadow"
                    : "text-gray-600 hover:bg-white/50"
                }`}
              >
                Territories
              </button>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {filtered.length} jobs · {money(filtered.reduce((s, j) => s + (j.value ?? 0), 0))} pipeline
          </div>
        </div>

        {/* Color mode toggle */}
        <div className="px-4 py-2.5 border-b border-gray-100 flex gap-1">
          <button
            onClick={() => setColorMode("stage")}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium transition ${
              colorMode === "stage"
                ? "bg-orange-100 text-orange-800"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            Color by Stage
          </button>
          <button
            onClick={() => setColorMode("crew")}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium transition ${
              colorMode === "crew"
                ? "bg-orange-100 text-orange-800"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            Color by Crew
          </button>
        </div>

        {/* Filters */}
        <div className="px-4 py-2.5 border-b border-gray-100 space-y-2">
          <FilterSelect
            label="Stage"
            value={stageFilter}
            onChange={setStageFilter}
            options={STAGE_ORDER}
          />
          <FilterSelect
            label="PM"
            value={pmFilter}
            onChange={setPmFilter}
            options={pms}
          />
          {types.length > 0 && (
            <FilterSelect
              label="Type"
              value={typeFilter}
              onChange={setTypeFilter}
              options={types}
            />
          )}
          {(stageFilter || pmFilter || typeFilter) && (
            <button
              onClick={() => { setStageFilter(null); setPmFilter(null); setTypeFilter(null); }}
              className="text-xs text-orange-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Crew coverage highlight */}
        <div className="px-4 py-2.5 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
            Crew coverage
          </div>
          <div className="relative">
            <select
              value={selectedCrew ?? ""}
              onChange={e => setSelectedCrew(e.target.value || null)}
              className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 appearance-none bg-white pr-6 text-gray-700"
            >
              <option value="">— show all zones —</option>
              {crews.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-1.5 top-1.5 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
          {selectedCrew && selectedCrewZones.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {selectedCrewZones.map(z => (
                <span
                  key={z}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200"
                  onClick={() => {
                    const rect = ZONE_RECTS[z];
                    if (rect) {
                      const lat = (rect[0][0] + rect[1][0]) / 2;
                      const lng = (rect[0][1] + rect[1][1]) / 2;
                      setFlyTarget({ center: [lat, lng], zoom: 12 });
                    }
                  }}
                >
                  {z}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Zone/Territory stats */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2.5">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Jobs by {viewMode === "zones" ? "Zone" : "Territory"}
            </div>
            <div className="space-y-2">
              {viewMode === "zones"
                ? zoneAgg.map(([zone, data]) => (
                    <button
                      key={zone}
                      className="w-full text-left hover:bg-gray-50 rounded-md p-1.5 transition"
                      onClick={() => {
                        const rect = ZONE_RECTS[zone];
                        if (rect) {
                          const lat = (rect[0][0] + rect[1][0]) / 2;
                          const lng = (rect[0][1] + rect[1][1]) / 2;
                          setFlyTarget({ center: [lat, lng], zoom: 12 });
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-700 truncate">{zone}</span>
                        <span className="text-xs font-semibold text-orange-600 ml-2 flex-shrink-0">
                          {data.count}
                        </span>
                      </div>
                      <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-400 rounded-full"
                          style={{ width: `${(data.count / maxZoneCount) * 100}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{money(data.value)}</div>
                    </button>
                  ))
                : territoryAgg.map(([territory, data]) => {
                    const terr = Object.values(TERRITORIES).find((t) => t.name === territory);
                    const maxTerrCount = Math.max(...territoryAgg.map(([, d]) => d.count), 1);
                    return (
                      <button
                        key={territory}
                        className="w-full text-left hover:bg-gray-50 rounded-md p-1.5 transition"
                        onClick={() => {
                          if (terr) {
                            const jaxCenter: [number, number] = [30.25, -81.55];
                            setFlyTarget({ center: jaxCenter, zoom: 11 });
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          {terr && (
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: terr.color }}
                            />
                          )}
                          <span className="text-xs text-gray-700 truncate flex-1 ml-1">{territory}</span>
                          <span className="text-xs font-semibold text-orange-600 ml-2 flex-shrink-0">
                            {data.count}
                          </span>
                        </div>
                        <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition"
                            style={{
                              backgroundColor: terr?.color || "#f97316",
                              width: `${(data.count / maxTerrCount) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{money(data.value)}</div>
                      </button>
                    );
                  })}
              {(viewMode === "zones" ? zoneAgg.length : territoryAgg.length) === 0 && (
                <div className="text-xs text-gray-400 text-center py-4">No jobs match filters</div>
              )}
            </div>
          </div>
        </div>

        {/* Stage legend */}
        {colorMode === "stage" && activeStages.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Legend</div>
            <div className="space-y-1">
              {activeStages.map(st => (
                <div key={st} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: STAGE_COLORS[st] ?? "#94a3b8" }}
                  />
                  <span className="text-[10px] text-gray-600">{st}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Map area ──────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        <MapContainer
          center={JAX_CENTER}
          zoom={10}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
        >
          {/* Fly-to controller */}
          {flyTarget && (
            <FlyTo
              center={flyTarget.center}
              zoom={flyTarget.zoom}
            />
          )}

          {/* CartoDB Positron tiles — clean, light, no API key needed */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            subdomains="abcd"
            maxZoom={20}
          />

          {/* Zone rectangles — colored by territory if in territory view */}
          {Object.entries(ZONE_RECTS).map(([zone, bounds]) => {
            const isCovered = selectedCrewZones.includes(zone as never);
            let zoneColor = "#d1d5db";
            let zoneFillColor = "#f3f4f6";
            let zoneOpacity = 0.04;

            if (viewMode === "territories") {
              // Find which territory this zone belongs to by checking ZIP codes
              const zoneZipEntry = Object.entries(ZONE_BY_ZIP).find(([, z]) => z === zone);
              if (zoneZipEntry) {
                const [zip] = zoneZipEntry;
                const territory = getTerritoryByZip(zip);
                if (territory) {
                  zoneColor = territory.color;
                  zoneFillColor = territory.color;
                  zoneOpacity = 0.15;
                }
              }
            } else if (isCovered) {
              zoneColor = "#3b82f6";
              zoneFillColor = "#3b82f6";
              zoneOpacity = 0.12;
            }

            return (
              <Rectangle
                key={zone}
                bounds={bounds}
                pathOptions={{
                  color: zoneColor,
                  weight: isCovered && viewMode === "zones" ? 2 : 1,
                  fill: true,
                  fillColor: zoneFillColor,
                  fillOpacity: zoneOpacity,
                  dashArray: isCovered && viewMode === "zones" ? undefined : "4 4",
                }}
              >
                <Tooltip sticky={false} direction="center" permanent={false}>
                  <span className="text-xs font-medium">{zone}</span>
                </Tooltip>
              </Rectangle>
            );
          })}

          {/* Job markers */}
          {mappable.map(job => {
            const base = ZIP_CENTROIDS[job.zip];
            const [jLat, jLng] = jitter(job.id);
            const pos: [number, number] = [base[0] + jLat, base[1] + jLng];

            let color: string;
            if (colorMode === "crew" && job.crew) {
              color = crewHex(crewColorMap[job.crew] ?? null);
            } else {
              color = STAGE_COLORS[job.productionStage] ?? "#94a3b8";
            }

            const isSelected = selectedJob?.id === job.id;

            return (
              <CircleMarker
                key={job.id}
                center={pos}
                radius={isSelected ? 12 : 8}
                pathOptions={{
                  color:       "#fff",
                  weight:      isSelected ? 2.5 : 1.5,
                  fillColor:   color,
                  fillOpacity: 0.92,
                }}
                eventHandlers={{
                  click: () => setSelectedJob(job),
                }}
              >
                <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                  <div className="text-xs leading-tight">
                    <div className="font-medium">{job.name}</div>
                    <div className="text-gray-500">{job.productionStage}</div>
                    {job.pmName && <div className="text-gray-500">{job.pmName.split(" ")[0]}</div>}
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Job detail panel (bottom overlay) */}
        {selectedJob && (
          <JobPanel job={selectedJob} onClose={() => setSelectedJob(null)} />
        )}

        {/* Unmappable count badge */}
        {filtered.length - mappable.length > 0 && (
          <div className="absolute top-3 right-3 z-[1000] bg-white rounded-full shadow px-2.5 py-1 text-[11px] text-gray-500 border border-gray-200">
            {filtered.length - mappable.length} job{filtered.length - mappable.length !== 1 ? "s" : ""} without ZIP
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value ?? ""}
        onChange={e => onChange(e.target.value || null)}
        className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 appearance-none bg-white pr-6 text-gray-700"
      >
        <option value="">All {label}s</option>
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-1.5 top-1.5 w-3 h-3 text-gray-400 pointer-events-none" />
    </div>
  );
}

function JobPanel({ job, onClose }: { job: MapJob; onClose: () => void }) {
  const stageColor = STAGE_COLORS[job.productionStage] ?? "#94a3b8";

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-white border-t border-gray-200 shadow-lg">
      <div className="flex items-start gap-4 p-4">
        {/* Stage pill */}
        <div
          className="mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: stageColor }}
        />

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{job.name}</span>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium"
              style={{ backgroundColor: stageColor }}
            >
              {job.productionStage}
            </span>
            {job.projectType && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {job.projectType}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{job.address}{job.city ? `, ${job.city}` : ""}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs text-gray-600">
            {job.pmName && <span><span className="text-gray-400">PM:</span> {job.pmName}</span>}
            {job.crew && <span><span className="text-gray-400">Crew:</span> {job.crew}</span>}
            {job.value != null && <span><span className="text-gray-400">Value:</span> ${job.value.toLocaleString()}</span>}
            {job.startDate && <span><span className="text-gray-400">Start:</span> {job.startDate}</span>}
            {job.endDate && <span><span className="text-gray-400">End:</span> {job.endDate}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {job.isActivated ? (
            <a
              href="/pipeline"
              className="text-xs text-orange-600 hover:underline flex items-center gap-1"
            >
              Pipeline <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-[10px] text-gray-400">Not yet activated</span>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
