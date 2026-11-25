"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStatusStyle, formatCategory, confidenceLabel, confidenceColor } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { BarChart3, AlertTriangle, FileText, Users, Zap, ChevronRight, RefreshCw } from "lucide-react";

interface Summary {
  total_reports: number;
  reports_last_7_days: number;
  total_incidents: number;
  active_incidents: number;
  resolved_incidents: number;
}

interface Incident {
  id: string;
  title: string;
  status: string;
  evidence_confidence: number;
  investigation_priority: number;
  independent_reporter_count: number;
  detection_time: string;
  primary_categories: string[];
}

interface CategoryStat {
  category: string;
  count: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push("/auth/login"); return; }

      const profile = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
      const userRole = profile.data?.role;

      if (userRole !== "admin" && userRole !== "maintenance") {
        router.push("/dashboard");
        return;
      }

      setToken(session.access_token);
      setRole(userRole);

      try {
        const [sumData, incData, catData] = await Promise.all([
          api.analytics.summary(session.access_token) as Promise<Summary>,
          api.incidents.list(session.access_token) as Promise<{ items: Incident[] }>,
          api.analytics.categories(session.access_token) as Promise<CategoryStat[]>,
        ]);
        setSummary(sumData);
        setIncidents(incData.items ?? []);
        setCategories(catData);
      } catch { /* backend may not be running */ }
      setLoading(false);
    });
  }, [router]);

  const handleAnalyze = async () => {
    if (!token) return;
    setAnalyzing(true);
    setAnalyzeResult(null);
    try {
      const result = await api.incidents.analyze(token) as {
        incidents_created: number;
        incidents_updated: number;
        reports_processed: number;
        clusters_found: number;
      };
      setAnalyzeResult(
        `Analysis complete: ${result.incidents_created} new incident(s) created, ${result.incidents_updated} updated from ${result.reports_processed} reports.`
      );
    } catch (e: unknown) {
      setAnalyzeResult(`Error: ${e instanceof Error ? e.message : "Analysis failed"}`);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">Loading admin dashboard...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operations Dashboard</h1>
          <p className="text-slate-500 mt-0.5 text-sm">Role: {role?.toUpperCase()}</p>
        </div>
        <Button onClick={handleAnalyze} loading={analyzing} className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Run AI Analysis
        </Button>
      </div>

      {analyzeResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 text-sm text-blue-800">
          {analyzeResult}
        </div>
      )}

      {/* Summary metrics */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total Reports", value: summary.total_reports, icon: FileText, color: "text-blue-600" },
            { label: "Last 7 Days", value: summary.reports_last_7_days, icon: BarChart3, color: "text-purple-600" },
            { label: "Total Incidents", value: summary.total_incidents, icon: AlertTriangle, color: "text-amber-600" },
            { label: "Active Incidents", value: summary.active_incidents, icon: RefreshCw, color: "text-orange-600" },
            { label: "Resolved", value: summary.resolved_incidents, icon: Users, color: "text-green-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className={`text-2xl font-bold ${color}`}>{value}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                  </div>
                  <Icon className={`h-5 w-5 ${color} opacity-60`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Active incidents */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Active Incidents</CardTitle>
                <Link href="/admin/incidents" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  Manage all <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {incidents.filter(i => !["RESOLVED", "REJECTED"].includes(i.status)).length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No active incidents</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incidents
                    .filter(i => !["RESOLVED", "REJECTED"].includes(i.status))
                    .slice(0, 8)
                    .map((inc) => (
                      <Link key={inc.id} href={`/admin/incidents/${inc.id}`}>
                        <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all cursor-pointer">
                          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-slate-900 truncate">{inc.title}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge className={getStatusStyle(inc.status)}>{inc.status.replace(/_/g, " ")}</Badge>
                              <span className={`text-xs font-medium ${confidenceColor(inc.evidence_confidence)}`}>
                                {confidenceLabel(inc.evidence_confidence)} confidence
                              </span>
                              <span className="text-xs text-slate-400">
                                {inc.independent_reporter_count} reporter{inc.independent_reporter_count !== 1 ? "s" : ""}
                              </span>
                              <span className="text-xs text-slate-400">
                                {formatDistanceToNow(new Date(inc.detection_time), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        </div>
                      </Link>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Categories */}
        <Card>
          <CardHeader><CardTitle>Reports by Category</CardTitle></CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No data</div>
            ) : (
              <div className="space-y-3">
                {categories.slice(0, 8).map(({ category, count }) => {
                  const max = categories[0]?.count ?? 1;
                  return (
                    <div key={category}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-700 font-medium">{formatCategory(category)}</span>
                        <span className="text-slate-500">{count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full">
                        <div
                          className="h-1.5 bg-blue-500 rounded-full transition-all"
                          style={{ width: `${(count / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
