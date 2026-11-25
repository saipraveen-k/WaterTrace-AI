"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { getStatusStyle, formatCategory, confidenceLabel, confidenceColor, INCIDENT_STATUSES } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { AlertTriangle, Users, Clock, Info, ChevronLeft, CheckCircle } from "lucide-react";

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
  is_demo: boolean;
}

interface IncidentEvent {
  id: string;
  event_type: string;
  from_status?: string;
  to_status?: string;
  notes?: string;
  created_at: string;
}

interface ContributingReport {
  id: string;
  issue_category: string;
  occurrence_time: string;
  location_description?: string;
  is_demo: boolean;
}

export default function AdminIncidentPage() {
  const { id } = useParams();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [reports, setReports] = useState<ContributingReport[]>([]);
  const [history, setHistory] = useState<IncidentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push("/auth/login"); return; }
      setToken(session.access_token);
      setNewStatus("");

      const [incData, repsData, histData] = await Promise.all([
        api.incidents.get(session.access_token, id as string),
        api.incidents.getReports(id as string),
        api.incidents.getHistory(session.access_token, id as string),
      ]).catch(() => [null, [], []]);

      if (incData) {
        setIncident(incData as Incident);
        setNewStatus((incData as Incident).status);
      }
      setReports(repsData as ContributingReport[]);
      setHistory(histData as IncidentEvent[]);
      setLoading(false);
    });
  }, [id, router]);

  const handleUpdateStatus = async () => {
    if (!token || !incident || !newStatus) return;
    setUpdating(true);
    setUpdateSuccess(false);
    try {
      await api.incidents.updateStatus(token, incident.id, { status: newStatus, notes });
      setIncident({ ...incident, status: newStatus });
      setUpdateSuccess(true);
      setNotes("");
    } catch { /* handle silently */ }
    setUpdating(false);
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-400">Loading...</div>;
  if (!incident) return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-red-500">Incident not found</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin")}>
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="text-sm text-slate-400">Admin › Incident Investigation</div>
      </div>

      {/* Title */}
      <div>
        {incident.is_demo && (
          <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-medium px-3 py-1 rounded-full mb-3">
            DEMO DATA
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

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Evidence Confidence", value: `${(incident.evidence_confidence * 100).toFixed(0)}%`, color: confidenceColor(incident.evidence_confidence) },
          { label: "Investigation Priority", value: `${(incident.investigation_priority * 100).toFixed(0)}%`, color: "text-slate-700" },
          { label: "Independent Reporters", value: incident.independent_reporter_count, color: "text-slate-700" },
          { label: "Total Reports", value: incident.total_report_count, color: "text-slate-700" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
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

      {/* Status management */}
      <Card>
        <CardHeader><CardTitle>Investigation Workflow</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Select
            label="Update Status"
            id="status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={INCIDENT_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
          />
          <div>
            <label className="text-sm font-medium text-slate-700">Investigation Notes (optional)</label>
            <textarea
              className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about your investigation findings..."
            />
          </div>
          {updateSuccess && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              Status updated successfully
            </div>
          )}
          <Button onClick={handleUpdateStatus} loading={updating} disabled={newStatus === incident.status}>
            Update Status
          </Button>
        </CardContent>
      </Card>

      {/* Contributing reports */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Contributing Reports ({reports.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reports.map((r, i) => (
              <div key={r.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </div>
                <div>
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

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Investigation History</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((ev) => (
                <div key={ev.id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />
                  <div>
                    <span className="font-medium text-slate-700">{ev.event_type}</span>
                    {ev.from_status && ev.to_status && (
                      <span className="text-slate-500"> — {ev.from_status.replace(/_/g, " ")} → {ev.to_status.replace(/_/g, " ")}</span>
                    )}
                    {ev.notes && <p className="text-slate-500 mt-0.5">{ev.notes}</p>}
                    <p className="text-xs text-slate-400 mt-0.5">{format(new Date(ev.created_at), "PPp")}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
