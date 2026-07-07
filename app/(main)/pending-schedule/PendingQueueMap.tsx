"use client";

/**
 * Geographic map for the Pending Queue.
 * Shows each pending job as a colored pin (by territory) on a Jacksonville map.
 * Popups show PM suggestion + predicted start date.
 *
 * Uses dynamic import — Leaflet is browser-only.
 */

import dynamic from "next/dynamic";
import type { Territory } from "@/lib/territories";
import type { StartDatePrediction } from "@/lib/recommend";
import type { PipelineJob } from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MapJob {
  job: PipelineJob;
  territory: Territory;
  suggestedPm: string | null;
  pmScore: number;
  prediction: StartDatePrediction;
  lat: number;
  lng: number;
}

// ─── ZIP → centroid (Jacksonville MSA) ──────────────────────────────────────

const ZIP_CENTROIDS: Record<string, [number, number]> = {
  "32250": [30.2752, -81.3998],
  "32233": [30.3321, -81.3968],
  "32266": [30.3107, -81.4010],
  "32082": [30.2387, -81.3876],
  "32081": [30.1110, -81.4017],
  "32084": [29.8920, -81.3147],
  "32086": [29.8300, -81.2896],
  "32092": [30.0736, -81.5012],
  "32095": [30.0168, -81.4022],
  "32097": [30.6340, -81.5927],
  "32034": [30.6694, -81.4624],
  "32257": [30.2002, -81.5764],
  "32223": [30.1640, -81.5776],
  "32258": [30.1425, -81.5593],
  "32259": [30.1055, -81.5386],
  "32003": [30.1650, -81.7084],
  "32073": [30.1744, -81.6881],
  "32065": [30.2117, -81.7441],
  "32068": [30.0740, -81.8665],
  "32205": [30.3060, -81.6990],
  "32204": [30.3244, -81.6851],
  "32210": [30.2744, -81.7408],
  "32244": [30.2354, -81.7274],
  "32218": [30.4356, -81.6295],
  "32219": [30.3983, -81.7151],
  "32226": [30.4576, -81.5157],
  "32256": [30.2106, -81.5423],
  "32224": [30.2585, -81.4863],
  "32225": [30.3165, -81.5198],
  "32246": [30.2929, -81.5426],
  "32217": [30.2784, -81.6295],
  "32207": [30.2953, -81.6381],
  "32202": [30.3228, -81.6557],
  "32206": [30.3498, -81.6471],
  "32208": [30.3726, -81.6557],
  "32209": [30.3741, -81.7002],
  "32211": [30.3298, -81.5621],
  "32216": [30.2813, -81.5623],
  "32236": [30.2185, -81.8621],
  "32080": [29.9012, -81.3200],
  "32110": [29.4629, -81.2572],
  "32136": [29.4735, -81.1266],
  "32137": [29.5853, -81.2131],
  "32164": [29.4935, -81.2271],
  "32277": [30.3698, -81.5101],
};

export function getJobCoords(zip: string | null | undefined): [number, number] | null {
  if (!zip) return null;
  const clean = (zip ?? "").trim().slice(0, 5);
  return ZIP_CENTROIDS[clean] ?? null;
}

// ─── Lazy-load the actual Leaflet map (no SSR) ──────────────────────────────

const LeafletMapInner = dynamic(() => import("./LeafletMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-provision-gray rounded-xl">
      <div className="text-sm text-provision-gray-text">Loading map…</div>
    </div>
  ),
});

// ─── Public component ────────────────────────────────────────────────────────

export function PendingQueueMap({
  mapJobs,
  selectedJobId,
  onSelectJob,
}: {
  mapJobs: MapJob[];
  selectedJobId: string | null;
  onSelectJob: (id: string | null) => void;
}) {
  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-provision-gray-mid shadow-card">
      <LeafletMapInner
        mapJobs={mapJobs}
        selectedJobId={selectedJobId}
        onSelectJob={onSelectJob}
      />
    </div>
  );
}
