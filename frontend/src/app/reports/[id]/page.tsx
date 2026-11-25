import { Suspense } from "react";
import ReportDetailClient from "./report-client";

export const dynamic = "force-dynamic";

export default function ReportDetailPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-4 py-16 text-center text-slate-400">Loading report...</div>}>
      <ReportDetailClient />
    </Suspense>
  );
}
