import { Suspense } from "react";
import AdminIncidentClient from "./incident-client";

export const dynamic = "force-dynamic";

export default function AdminIncidentPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-400">Loading incident...</div>}>
      <AdminIncidentClient />
    </Suspense>
  );
}
