"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { MapJob } from "./PendingQueueMap";

// ─── Auto-fit map to all markers ────────────────────────────────────────────

function FitBounds({ jobs }: { jobs: MapJob[] }) {
  const map = useMap();
  useEffect(() => {
    if (jobs.length === 0) return;
    const lats = jobs.map((j) => j.lat);
    const lngs = jobs.map((j) => j.lng);
    const pad = 0.05;
    map.fitBounds(
      [
        [Math.min(...lats) - pad, Math.min(...lngs) - pad],
        [Math.max(...lats) + pad, Math.max(...lngs) + pad],
      ],
      { animate: false }
    );
  }, [jobs, map]);
  return null;
}

// ─── Main map ───────────────────────────────────────────────────────────────

export default function LeafletMapInner({
  mapJobs,
  selectedJobId,
  onSelectJob,
}: {
  mapJobs: MapJob[];
  selectedJobId: string | null;
  onSelectJob: (id: string | null) => void;
}) {
  const confidenceRing: Record<string, string> = {
    high:   "rgba(5, 195, 222, 0.35)",   // teal
    medium: "rgba(246, 190, 0, 0.35)",   // yellow
    low:    "rgba(156, 163, 175, 0.35)", // gray
  };

  return (
    <MapContainer
      center={[30.25, -81.55]}
      zoom={10}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      {mapJobs.length > 0 && <FitBounds jobs={mapJobs} />}

      {mapJobs.map((mj) => {
        const isSelected = mj.job.id === selectedJobId;
        const ringColor = confidenceRing[mj.prediction.confidence];

        return (
          <CircleMarker
            key={mj.job.id}
            center={[mj.lat, mj.lng]}
            radius={isSelected ? 14 : 10}
            pathOptions={{
              fillColor: mj.territory.color,
              fillOpacity: isSelected ? 1 : 0.85,
              color: isSelected ? "#101820" : ringColor,
              weight: isSelected ? 3 : 6,
              opacity: isSelected ? 1 : 0.6,
            }}
            eventHandlers={{
              click: () => onSelectJob(isSelected ? null : mj.job.id),
            }}
          >
            <Tooltip
              direction="top"
              offset={[0, -12]}
              opacity={1}
              permanent={false}
            >
              <div style={{ minWidth: 180, fontFamily: "Inter, sans-serif" }}>
                {/* Job name */}
                <div style={{ fontWeight: 700, fontSize: 12, color: "#101820", marginBottom: 4 }}>
                  {mj.job.name || mj.job.address || "Job"}
                </div>

                {/* Territory */}
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: mj.territory.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "#6B7280" }}>{mj.territory.name}</span>
                </div>

                {/* PM suggestion */}
                {mj.suggestedPm && (
                  <div style={{ fontSize: 11, marginBottom: 4 }}>
                    <span style={{ color: "#6B7280" }}>PM: </span>
                    <span style={{ fontWeight: 600, color: "#D14124" }}>{mj.suggestedPm}</span>
                    <span style={{ color: "#9CA3AF", marginLeft: 4 }}>{mj.pmScore}%</span>
                  </div>
                )}

                {/* Predicted start */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 4,
                  backgroundColor: mj.prediction.confidence === "high" ? "#e0f7fb" : "#f3f4f6",
                  borderRadius: 4, padding: "3px 6px", marginTop: 2,
                }}>
                  <span style={{ fontSize: 10, color: "#6B7280" }}>📅</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: mj.prediction.confidence === "high" ? "#05C3DE" : "#9CA3AF",
                  }}>
                    {mj.prediction.suggestedDateFormatted}
                  </span>
                  <span style={{ fontSize: 10, color: "#9CA3AF" }}>
                    ({mj.prediction.daysFromNow}d)
                  </span>
                </div>

                {/* Revenue */}
                {mj.job.value && (
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>
                    ${Math.round(mj.job.value / 1000)}K
                  </div>
                )}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
