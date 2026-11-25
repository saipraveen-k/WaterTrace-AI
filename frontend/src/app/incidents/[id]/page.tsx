import { Suspense } from "react";
import IncidentDetailClient from "./incident-client";

export const dynamic = "force-dynamic";

export default function IncidentDetailPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-400">Loading incident...</div>}>
      <IncidentDetailClient />
    </Suspense>
  );
}
