"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStatusStyle, formatCategory, confidenceLabel, confidenceColor } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { MapPin, AlertTriangle, ChevronRight, Users } from "lucide-react";
import dynamic from "next/dynamic";

const IncidentsMap = dynamic(() => import("@/components/map/incidents-map"), { ssr: false });

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
  detection_time: string;
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentMapItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.incidents.getMap()
      .then((data) => setIncidents(data as IncidentMapItem[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Incidents Map</h1>
        <p className="text-slate-500 mt-1">
          Candidate infrastructure incidents detected from citizen reports. These require investigation before any action.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <div className="rounded-xl overflow-hidden border border-slate-200 h-[500px] bg-slate-100">
            {!loading && <IncidentsMap incidents={incidents} />}
            {loading && (
              <div className="h-full flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Loading map...</p>
                </div>
              </div>
            )}
          </div>
          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
            {[
              { color: "bg-blue-500", label: "Detected" },
              { color: "bg-amber-500", label: "Needs Review" },
              { color: "bg-orange-500", label: "Under Investigation" },
              { color: "bg-purple-500", label: "Action Initiated" },
              { color: "bg-green-500", label: "Resolved" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`h-3 w-3 rounded-full ${color}`} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Incident list */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
            {incidents.length} Incident{incidents.length !== 1 ? "s" : ""}
          </h2>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
            ))
          ) : incidents.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No incidents detected yet</p>
            </div>
          ) : (
            incidents.map((inc) => (
              <Link key={inc.id} href={`/incidents/${inc.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 leading-tight">{inc.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatDistanceToNow(new Date(inc.detection_time), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getStatusStyle(inc.status)}>{inc.status.replace("_", " ")}</Badge>
                      <span className={`text-xs font-medium ${confidenceColor(inc.evidence_confidence)}`}>
                        {confidenceLabel(inc.evidence_confidence)} confidence
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                      <Users className="h-3 w-3" />
                      {inc.independent_reporter_count} independent reporter{inc.independent_reporter_count !== 1 ? "s" : ""}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
