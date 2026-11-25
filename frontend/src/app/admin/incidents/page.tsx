"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { getStatusStyle, formatCategory, confidenceLabel, confidenceColor, INCIDENT_STATUSES } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, ChevronRight, ChevronLeft, Users } from "lucide-react";

interface Incident {
  id: string;
  title: string;
  status: string;
  evidence_confidence: number;
  investigation_priority: number;
  independent_reporter_count: number;
  total_report_count: number;
  primary_categories: string[];
  detection_time: string;
  is_demo: boolean;
}

export default function AdminIncidentsListPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push("/auth/login"); return; }

      const profile = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
      if (!["admin", "maintenance"].includes(profile.data?.role)) {
        router.push("/dashboard");
        return;
      }
      setToken(session.access_token);

      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;

      api.incidents
        .list(session.access_token, params)
        .then((d) => setIncidents((d as { items: Incident[] }).items ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, [router, statusFilter]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin")}>
          <ChevronLeft className="h-4 w-4" />
          Dashboard
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Incidents</h1>
          <p className="text-slate-500 text-sm mt-0.5">{incidents.length} incident{incidents.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="w-56">
          <Select
            id="status"
            options={[{ value: "", label: "All statuses" }, ...INCIDENT_STATUSES.map((s) => ({ value: s.value, label: s.label }))]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : incidents.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <AlertTriangle className="h-14 w-14 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-slate-500">No incidents found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => (
            <Link key={inc.id} href={`/admin/incidents/${inc.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="font-medium text-slate-900 text-sm">{inc.title}</span>
                        {inc.is_demo && <Badge className="bg-amber-100 text-amber-700 flex-shrink-0">DEMO</Badge>}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getStatusStyle(inc.status)}>{inc.status.replace(/_/g, " ")}</Badge>
                        <span className={`text-xs font-medium ${confidenceColor(inc.evidence_confidence)}`}>
                          {confidenceLabel(inc.evidence_confidence)} confidence ({(inc.evidence_confidence * 100).toFixed(0)}%)
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {inc.independent_reporter_count} reporter{inc.independent_reporter_count !== 1 ? "s" : ""}
                        </span>
                        <span className="text-xs text-slate-400">
                          Priority: {(inc.investigation_priority * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {inc.primary_categories.slice(0, 3).map((c) => (
                          <span key={c} className="text-xs text-slate-500">{formatCategory(c)}</span>
                        ))}
                        <span className="text-xs text-slate-400">
                          {formatDistanceToNow(new Date(inc.detection_time), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
