"use client";

import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getStatusStyle, formatCategory } from "@/lib/utils";
import Link from "next/link";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function getMarkerColor(status: string): string {
  const colorMap: Record<string, string> = {
    DETECTED: "#3b82f6",
    NEEDS_REVIEW: "#f59e0b",
    UNDER_INVESTIGATION: "#f97316",
    ACTION_INITIATED: "#8b5cf6",
    RESOLVED: "#10b981",
    REOPENED: "#ef4444",
    REJECTED: "#9ca3af",
  };
  return colorMap[status] ?? "#3b82f6";
}

function createColoredIcon(color: string) {
  return L.divIcon({
    html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
    className: "",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

interface IncidentMapItem {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  affected_radius_meters?: number;
  status: string;
  primary_categories: string[];
  independent_reporter_count: number;
  evidence_confidence: number;
}

interface IncidentsMapProps {
  incidents: IncidentMapItem[];
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
}

export default function IncidentsMap({ incidents, centerLat = 17.385, centerLng = 78.4867, zoom = 12 }: IncidentsMapProps) {
  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {incidents.map((inc) => {
        const color = getMarkerColor(inc.status);
        return (
          <div key={inc.id}>
            {inc.affected_radius_meters && inc.affected_radius_meters > 0 && (
              <Circle
                center={[inc.latitude, inc.longitude]}
                radius={inc.affected_radius_meters}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.1, weight: 1.5 }}
              />
            )}
            <Marker position={[inc.latitude, inc.longitude]} icon={createColoredIcon(color)}>
              <Popup>
                <div className="min-w-48">
                  <p className="font-semibold text-sm text-slate-900 mb-1">{inc.title}</p>
                  <p className="text-xs text-slate-600 mb-1">
                    {inc.primary_categories.map((c) => formatCategory(c)).join(", ")}
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs">{inc.independent_reporter_count} reporter{inc.independent_reporter_count !== 1 ? "s" : ""}</span>
                    <span className="text-xs text-slate-400">|</span>
                    <span className="text-xs">{(inc.evidence_confidence * 100).toFixed(0)}% confidence</span>
                  </div>
                  <Link href={`/incidents/${inc.id}`} className="text-xs text-blue-600 hover:underline font-medium">
                    View details →
                  </Link>
                </div>
              </Popup>
            </Marker>
          </div>
        );
      })}
    </MapContainer>
  );
}
