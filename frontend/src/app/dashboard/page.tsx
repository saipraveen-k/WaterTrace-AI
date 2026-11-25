"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCategory, getStatusStyle, confidenceLabel, confidenceColor } from "@/lib/utils";
import { FileText, MapPin, Bell, Plus, AlertTriangle, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Report {
  id: string;
  issue_category: string;
  description: string;
  processing_status: string;
  submitted_at: string;
  ai_category?: string;
}

interface Incident {
  id: string;
  title: string;
  status: string;
  evidence_confidence: number;
  independent_reporter_count: number;
  detection_time: string;
  primary_categories: string[];
}

export default function DashboardPage() {
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        window.location.href = "/auth/login";
        return;
      }

      const profile = await supabase.from("profiles").select("full_name").eq("id", session.user.id).single();
      setUser({ email: session.user.email ?? "", name: profile.data?.full_name });

      try {
        const [reportsData, incidentsData] = await Promise.all([
          api.reports.list(session.access_token, { per_page: "5" }) as Promise<{ items: Report[] }>,
          api.incidents.list(session.access_token, { per_page: "5" }) as Promise<{ items: Incident[] }>,
        ]);
        setReports(reportsData.items ?? []);
        setIncidents(incidentsData.items ?? []);
      } catch {
        // Backend may not be running yet
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {user?.name ? `Welcome, ${user.name}` : "Dashboard"}
          </h1>
          <p className="text-slate-500 mt-0.5">{user?.email}</p>
        </div>
        <Link href="/reports/new">
          <Button>
            <Plus className="h-4 w-4" />
            Report an Issue
          </Button>
        </Link>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { href: "/reports/new", icon: Plus, label: "New Report", color: "bg-blue-50 text-blue-700 border-blue-200" },
          { href: "/reports", icon: FileText, label: "My Reports", color: "bg-slate-50 text-slate-700 border-slate-200" },
          { href: "/incidents", icon: MapPin, label: "Nearby Incidents", color: "bg-purple-50 text-purple-700 border-purple-200" },
          { href: "/notifications", icon: Bell, label: "Notifications", color: "bg-green-50 text-green-700 border-green-200" },
        ].map(({ href, icon: Icon, label, color }) => (
          <Link key={href} href={href}>
            <div className={`border rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-sm transition-shadow cursor-pointer ${color}`}>
              <Icon className="h-6 w-6" />
              <span className="text-sm font-medium text-center">{label}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* My recent reports */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>My Recent Reports</CardTitle>
              <Link href="/reports" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No reports yet</p>
                <Link href="/reports/new">
                  <Button variant="ghost" size="sm" className="mt-2">Report an issue</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((r) => (
                  <Link key={r.id} href={`/reports/${r.id}`}>
                    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-slate-900">{formatCategory(r.issue_category)}</span>
                          <Badge className="bg-slate-100 text-slate-600 text-xs">{r.processing_status}</Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{r.description}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatDistanceToNow(new Date(r.submitted_at), { addSuffix: true })}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Nearby incidents */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Incidents</CardTitle>
              <Link href="/incidents" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                View map <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : incidents.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <MapPin className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No incidents detected yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {incidents.map((inc) => (
                  <Link key={inc.id} href={`/incidents/${inc.id}`}>
                    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-slate-900 truncate">{inc.title}</span>
                          <Badge className={getStatusStyle(inc.status)}>{inc.status}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className={`text-xs font-medium ${confidenceColor(inc.evidence_confidence)}`}>
                            {confidenceLabel(inc.evidence_confidence)} confidence
                          </span>
                          <span className="text-xs text-slate-400">
                            {inc.independent_reporter_count} reporter{inc.independent_reporter_count !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
