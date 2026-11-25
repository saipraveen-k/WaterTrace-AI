"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStatusStyle, formatCategory, confidenceLabel, confidenceColor } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { AlertTriangle, Users, Clock, Info, MapPin } from "lucide-react";

interface Incident {
  id: string;
  title: string;
  status: string;
  evidence_confidence: number;
  investigation_priority: number;
  independent_reporter_count: number;
  total_report_count: number;
  primary_categories: string[];
  explanation: string;
  detection_time: string;
  latitude?: number;
  longitude?: number;
  affected_radius_meters?: number;
  is_demo: boolean;
}

interface ContributingReport {
  id: string;
  issue_category: string;
  occurrence_time: string;
  location_description?: string;
  ai_explanation?: string;
  is_demo: boolean;
}

export default function IncidentDetailPage() {
  const { id } = useParams();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [reports, setReports] = useState<ContributingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.incidents.get(undefined, id as string),
      api.incidents.getReports(id as string),
    ])
      .then(([inc, reps]) => {
        setIncident(inc as Incident);
        setReports(reps as ContributingReport[]);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-400">Loading incident...</div>;
  if (error || !incident) return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-red-500">{error || "Incident not found"}</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        {incident.is_demo && (
          <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-medium px-3 py-1 rounded-full mb-3">
            DEMO DATA — Simulated incident for demonstration purposes
          </div>
        )}
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-7 w-7 text-amber-500 flex-shrink-0 mt-1" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{incident.title}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <Badge className={getStatusStyle(incident.status)}>{incident.status.replace(/_/g, " ")}</Badge>
              <span className="text-sm text-slate-500">
                Detected {formatDistanceToNow(new Date(incident.detection_time), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex gap-3">
        <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Candidate Incident — Not a Confirmed Failure</p>
          <p className="text-sm text-amber-700 mt-1">
            This incident was detected automatically by analyzing citizen reports. It has not been confirmed
            by infrastructure engineers. Investigation by qualified maintenance personnel is required before any action.
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Evidence Confidence",
            value: `${(incident.evidence_confidence * 100).toFixed(0)}%`,
            sub: confidenceLabel(incident.evidence_confidence),
            color: confidenceColor(incident.evidence_confidence),
          },
          {
            label: "Investigation Priority",
            value: `${(incident.investigation_priority * 100).toFixed(0)}%`,
            sub: "Prototype score",
            color: "text-slate-700",
          },
          {
            label: "Independent Reporters",
            value: incident.independent_reporter_count.toString(),
            sub: "Unique users",
            color: "text-slate-700",
          },
          {
            label: "Total Reports",
            value: incident.total_report_count.toString(),
            sub: "Contributing reports",
            color: "text-slate-700",
          },
        ].map(({ label, value, sub, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
              <div className="text-xs text-slate-400">{sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Explanation */}
      {incident.explanation && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-blue-500" />Detection Explanation</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700 leading-relaxed">{incident.explanation}</p>
          </CardContent>
        </Card>
      )}

      {/* Categories and location */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Reported Categories</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {incident.primary_categories.map((cat) => (
                <Badge key={cat} className="bg-blue-100 text-blue-800">{formatCategory(cat)}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4" />Location</CardTitle></CardHeader>
          <CardContent>
            {incident.latitude ? (
              <div className="text-sm text-slate-600 space-y-1">
                <p>Latitude: {incident.latitude.toFixed(5)}</p>
                <p>Longitude: {incident.longitude?.toFixed(5)}</p>
                {incident.affected_radius_meters && (
                  <p>Approximate radius: {Math.round(incident.affected_radius_meters)}m</p>
                )}
                <p className="text-xs text-slate-400 mt-2">Approximate area only. Coordinates are not precise addresses.</p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Location data unavailable</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contributing reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contributing Reports ({reports.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-400 mb-4">
            Descriptions have been omitted to protect citizen privacy. Only category and timing are shown.
          </p>
          <div className="space-y-3">
            {reports.map((r, i) => (
              <div key={r.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-slate-100 text-slate-700 text-xs">{formatCategory(r.issue_category)}</Badge>
                    {r.is_demo && <Badge className="bg-amber-100 text-amber-700 text-xs">DEMO</Badge>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />
                    {format(new Date(r.occurrence_time), "PPp")}
                  </div>
                  {r.location_description && (
                    <p className="text-xs text-slate-500 mt-0.5">{r.location_description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
