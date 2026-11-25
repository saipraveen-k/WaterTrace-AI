"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatCategory, ISSUE_CATEGORIES } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { FileText, Plus, ChevronRight, Info } from "lucide-react";

interface Report {
  id: string;
  issue_category: string;
  description: string;
  processing_status: string;
  submitted_at: string;
  ai_category?: string;
  ai_confidence?: number;
  user_confirmed: boolean;
  is_demo: boolean;
}

interface ReportList {
  items: Report[];
  total: number;
  page: number;
  per_page: number;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  CLASSIFIED: "bg-blue-100 text-blue-700",
  CLUSTERED: "bg-purple-100 text-purple-700",
  INCIDENT_LINKED: "bg-amber-100 text-amber-700",
  REJECTED: "bg-red-100 text-red-700",
  DUPLICATE: "bg-gray-100 text-gray-600",
};

export default function ReportsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<ReportList | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/auth/login"); return; }
      setToken(session.access_token);
    });
  }, [router]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const params: Record<string, string> = { page: String(page), per_page: "15" };
    if (categoryFilter) params.category = categoryFilter;

    api.reports
      .list(token, params)
      .then((d) => setData(d as ReportList))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, categoryFilter, page]);

  const totalPages = data ? Math.ceil(data.total / 15) : 1;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Reports</h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            {data?.total ?? 0} report{(data?.total ?? 0) !== 1 ? "s" : ""} submitted
          </p>
        </div>
        <Link href="/reports/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Report
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-3 flex-wrap">
        <div className="w-56">
          <Select
            id="category"
            options={[{ value: "", label: "All categories" }, ...ISSUE_CATEGORIES]}
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Report list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !data?.items?.length ? (
        <div className="text-center py-16 text-slate-400">
          <FileText className="h-14 w-14 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-slate-500">No reports yet</p>
          <p className="text-sm mt-1 mb-6">Submit your first water issue report to get started.</p>
          <Link href="/reports/new">
            <Button>Report an Issue</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((r) => (
            <Link key={r.id} href={`/reports/${r.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-slate-900 text-sm">
                          {formatCategory(r.issue_category)}
                        </span>
                        <Badge className={STATUS_COLORS[r.processing_status] ?? "bg-slate-100 text-slate-700"}>
                          {r.processing_status}
                        </Badge>
                        {r.is_demo && <Badge className="bg-amber-100 text-amber-700">DEMO</Badge>}
                        {r.user_confirmed && (
                          <Badge className="bg-green-100 text-green-700">Confirmed</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2">{r.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-xs text-slate-400">
                          {formatDistanceToNow(new Date(r.submitted_at), { addSuffix: true })}
                        </span>
                        {r.ai_category && r.ai_category !== r.issue_category && (
                          <span className="text-xs text-blue-500 flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            AI: {formatCategory(r.ai_category)}
                          </span>
                        )}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
