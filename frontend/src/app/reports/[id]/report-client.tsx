"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatCategory, ISSUE_CATEGORIES } from "@/lib/utils";
import { format } from "date-fns";
import { FileText, MapPin, Clock, Brain, CheckCircle, AlertCircle, ChevronLeft } from "lucide-react";

interface Report {
  id: string;
  user_id: string;
  issue_category: string;
  description: string;
  latitude?: number;
  longitude?: number;
  location_description?: string;
  occurrence_time: string;
  submitted_at: string;
  ai_category?: string;
  ai_confidence?: number;
  ai_symptoms?: string[];
  ai_explanation?: string;
  confirmed_category?: string;
  user_confirmed: boolean;
  processing_status: string;
  is_demo: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  CLASSIFIED: "bg-blue-100 text-blue-700",
  CLUSTERED: "bg-purple-100 text-purple-700",
  INCIDENT_LINKED: "bg-amber-100 text-amber-700",
  REJECTED: "bg-red-100 text-red-700",
  DUPLICATE: "bg-gray-100 text-gray-600",
};

export default function ReportDetailClient() {
  const { id } = useParams();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmCategory, setConfirmCategory] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push("/auth/login"); return; }
      setToken(session.access_token);

      try {
        const r = await api.reports.get(session.access_token, id as string) as Report;
        setReport(r);
        setConfirmCategory(r.confirmed_category ?? r.ai_category ?? r.issue_category);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Report not found");
      } finally {
        setLoading(false);
      }
    });
  }, [id, router]);

  const handleConfirm = async () => {
    if (!token || !report || !confirmCategory) return;
    setConfirming(true);
    try {
      await api.reports.confirm(token, report.id, confirmCategory);
      setReport({ ...report, confirmed_category: confirmCategory, user_confirmed: true });
      setConfirmSuccess(true);
    } catch { /* handle silently */ }
    setConfirming(false);
  };

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-slate-400">Loading report...</div>;
  if (error || !report) return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-red-500">{error || "Report not found"}</div>;

  const canEdit = ["PENDING", "CLASSIFIED"].includes(report.processing_status);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/reports")}>
          <ChevronLeft className="h-4 w-4" />
          My Reports
        </Button>
      </div>

      {/* Header */}
      <div>
        {report.is_demo && (
          <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-medium px-3 py-1 rounded-full mb-3">
            DEMO DATA
          </div>
        )}
        <div className="flex items-start gap-3">
          <FileText className="h-7 w-7 text-blue-500 flex-shrink-0 mt-1" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{formatCategory(report.issue_category)}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <Badge className={STATUS_COLORS[report.processing_status] ?? "bg-slate-100 text-slate-700"}>
                {report.processing_status}
              </Badge>
              {report.user_confirmed && (
                <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Classification confirmed
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Report details */}
      <Card>
        <CardHeader><CardTitle>Report Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm text-slate-700 leading-relaxed">{report.description}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                <Clock className="h-3 w-3 inline mr-1" />
                When it occurred
              </p>
              <p className="text-sm text-slate-700">
                {format(new Date(report.occurrence_time), "PPp")}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                <Clock className="h-3 w-3 inline mr-1" />
                Submitted
              </p>
              <p className="text-sm text-slate-700">
                {format(new Date(report.submitted_at), "PPp")}
              </p>
            </div>
          </div>
          {(report.latitude || report.location_description) && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                <MapPin className="h-3 w-3 inline mr-1" />
                Location
              </p>
              {report.location_description && (
                <p className="text-sm text-slate-700">{report.location_description}</p>
              )}
              {report.latitude && (
                <p className="text-xs text-slate-400 mt-0.5">
                  Approx. {report.latitude.toFixed(4)}, {report.longitude?.toFixed(4)}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Classification */}
      {report.ai_category && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              AI Classification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <span className="text-xs text-slate-500">Category: </span>
                <span className="text-sm font-medium text-slate-800">{formatCategory(report.ai_category)}</span>
              </div>
              {report.ai_confidence !== undefined && (
                <div>
                  <span className="text-xs text-slate-500">Confidence: </span>
                  <span className="text-sm font-medium">{(report.ai_confidence * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>
            {report.ai_explanation && (
              <p className="text-sm text-slate-600 italic">{report.ai_explanation}</p>
            )}
            {report.ai_symptoms && report.ai_symptoms.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {report.ai_symptoms.map((s) => (
                  <Badge key={s} className="bg-purple-50 text-purple-700 text-xs">{s}</Badge>
                ))}
              </div>
            )}
            <div className="bg-slate-50 rounded-lg px-4 py-3 flex gap-2 text-xs text-slate-500">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              This is an automated classification. If it is incorrect, correct it below.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm / correct classification */}
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              {report.user_confirmed ? "Classification Confirmed" : "Confirm or Correct Classification"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {confirmSuccess && (
              <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                Classification saved. Thank you for confirming.
              </div>
            )}
            <Select
              label="Correct category (if AI is wrong)"
              id="confirm-category"
              options={ISSUE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
              value={confirmCategory}
              onChange={(e) => setConfirmCategory(e.target.value)}
            />
            <Button onClick={handleConfirm} loading={confirming} disabled={report.user_confirmed && confirmCategory === report.confirmed_category}>
              {report.user_confirmed ? "Update Confirmation" : "Confirm Classification"}
            </Button>
          </CardContent>
        </Card>
      )}

      {!canEdit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-700">
          This report is in <strong>{report.processing_status}</strong> status and can no longer be edited.
        </div>
      )}
    </div>
  );
}
