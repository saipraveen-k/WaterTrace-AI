"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ISSUE_CATEGORIES } from "@/lib/utils";
import { MapPin, AlertCircle, CheckCircle, Info } from "lucide-react";
import dynamic from "next/dynamic";

const LocationPicker = dynamic(() => import("@/components/map/location-picker"), { ssr: false });

const schema = z.object({
  issue_category: z.string().min(1, "Select a category"),
  description: z.string().min(10, "Describe the issue in at least 10 characters").max(2000),
  occurrence_time: z.string().min(1, "When did this occur?"),
  location_description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewReportPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState<{ id: string; ai_category: string; ai_explanation: string } | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/auth/login"); return; }
      setToken(session.access_token);
    });
  }, [router]);

  const onSubmit = async (data: FormData) => {
    if (!location) { setLocationError("Please select your approximate location on the map"); return; }
    if (!token) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const result = await api.reports.create(token, {
        issue_category: data.issue_category,
        description: data.description,
        occurrence_time: new Date(data.occurrence_time).toISOString(),
        location: {
          latitude: location.lat,
          longitude: location.lng,
          description: data.location_description,
        },
      }) as { id: string; ai_category: string; ai_explanation: string };
      setSubmitted(result);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-6">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Report Submitted</h1>
        <p className="text-slate-500 mb-4">Your report has been received and classified.</p>

        {submitted.ai_category && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-left mb-6">
            <div className="flex gap-2 items-start">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800">AI Classification</p>
                <p className="text-sm text-blue-700 mt-1">
                  Classified as: <strong>{submitted.ai_category?.replace(/_/g, " ")}</strong>
                </p>
                {submitted.ai_explanation && (
                  <p className="text-sm text-blue-600 mt-1 italic">{submitted.ai_explanation}</p>
                )}
                <p className="text-xs text-blue-500 mt-2">
                  This is an automated classification. You can correct it from your report details.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
          <Button onClick={() => router.push("/reports/new")}>Report Another Issue</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Report a Water Issue</h1>
        <p className="text-slate-500 mt-1">
          Describe the water problem you have observed. Your report helps identify possible shared infrastructure issues.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Issue Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Issue Category *"
              id="issue_category"
              options={ISSUE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
              placeholder="Select the type of issue"
              error={errors.issue_category?.message}
              {...register("issue_category")}
            />
            <Textarea
              label="Description *"
              id="description"
              rows={4}
              placeholder="Describe what you observed in detail — when it started, what you noticed, how it affects you..."
              error={errors.description?.message}
              hint="Minimum 10 characters. More detail helps the AI classify your report accurately."
              {...register("description")}
            />
            <Input
              label="When did this occur? *"
              id="occurrence_time"
              type="datetime-local"
              error={errors.occurrence_time?.message}
              {...register("occurrence_time")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Approximate Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex gap-2 text-sm text-amber-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              Select your approximate location. Do not use your exact home address — a nearby intersection or landmark is sufficient.
            </div>
            <div className="rounded-lg overflow-hidden border border-slate-200 h-72">
              <LocationPicker onLocationSelect={(lat, lng) => { setLocation({ lat, lng }); setLocationError(""); }} />
            </div>
            {location && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Location selected: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </p>
            )}
            {locationError && <p className="text-sm text-red-500">{locationError}</p>}
            <Input
              label="Location description (optional)"
              id="location_description"
              placeholder="e.g., Near Main Street and Oak Avenue"
              {...register("location_description")}
            />
          </CardContent>
        </Card>

        {submitError && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {submitError}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" loading={submitting} className="flex-1">
            Submit Report
          </Button>
        </div>
      </form>
    </div>
  );
}
