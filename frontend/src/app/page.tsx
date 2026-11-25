import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Droplets, MapPin, Brain, Shield, ArrowRight, Users, AlertTriangle } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-cyan-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-blue-700/50 text-blue-100 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Droplets className="h-4 w-4" />
              Smart Water Infrastructure Intelligence
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              One report is a complaint.{" "}
              <span className="text-cyan-300">A hundred connected reports</span>{" "}
              may reveal an infrastructure failure.
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-10 leading-relaxed">
              WaterTrace AI transforms independent citizen water reports into explainable
              infrastructure incident intelligence — helping maintenance teams identify, investigate
              and resolve shared issues faster.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/auth/register">
                <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 w-full sm:w-auto">
                  Report a Water Issue
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/incidents">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 w-full sm:w-auto">
                  <MapPin className="h-5 w-5" />
                  View Incidents Map
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: "Reports Analyzed", value: "Real-time" },
              { label: "Incident Detection", value: "Automated" },
              { label: "Geographic Coverage", value: "City-wide" },
              { label: "Data Privacy", value: "Approx. Locations" },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold text-blue-700">{value}</div>
                <div className="text-sm text-slate-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">How WaterTrace AI Works</h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            Independent reports are analyzed spatially, temporally and by symptom compatibility
            to detect possible shared infrastructure incidents.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Users,
              color: "bg-blue-100 text-blue-600",
              title: "Citizens Report Issues",
              description:
                "Residents submit water problems — no supply, low pressure, leakage, discolouration — with their approximate location and when it occurred.",
            },
            {
              icon: Brain,
              color: "bg-purple-100 text-purple-600",
              title: "AI Correlates Reports",
              description:
                "The intelligence engine analyzes geographic proximity, timing, symptom compatibility and independent sources to identify possible shared incidents.",
            },
            {
              icon: Shield,
              color: "bg-green-100 text-green-600",
              title: "Teams Investigate",
              description:
                "Maintenance teams see candidate incidents with transparent evidence scores and explanations, enabling faster, better-informed investigation decisions.",
            },
          ].map(({ icon: Icon, color, title, description }) => (
            <div key={title} className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
              <div className={`inline-flex p-3 rounded-xl ${color} mb-5`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">{title}</h3>
              <p className="text-slate-500 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Issue types */}
      <section className="bg-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-4">What Can You Report?</h2>
            <p className="text-slate-400">Report any water-related issue in your area.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              "No Water Supply",
              "Low Water Pressure",
              "Pipeline Leakage",
              "Discoloured Water",
              "Unusual Water Smell",
              "Intermittent Supply",
              "Infrastructure Damage",
              "Other Issues",
            ].map((issue) => (
              <div key={issue} className="bg-slate-800 rounded-lg px-4 py-3 text-sm font-medium text-slate-200 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-cyan-400 flex-shrink-0" />
                {issue}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Responsible AI disclaimer */}
      <section className="bg-amber-50 border-y border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-3 items-start">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Decision Support Tool</p>
              <p className="text-sm text-amber-700 mt-1">
                WaterTrace AI identifies candidate incidents based on citizen-reported observations.
                Detected incidents are not confirmed infrastructure failures. All findings require
                investigation by qualified maintenance teams before any official action.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">Help Your Community</h2>
        <p className="text-slate-500 text-lg mb-8 max-w-xl mx-auto">
          Your report could be the connection that reveals a neighbourhood-level infrastructure issue.
        </p>
        <Link href="/auth/register">
          <Button size="lg">
            Create Account &amp; Report
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-blue-600 font-semibold">
            <Droplets className="h-5 w-5" />
            WaterTrace AI
          </div>
          <p className="text-sm text-slate-400">
            A decision-support platform for water infrastructure teams. Not a substitute for professional engineering assessment.
          </p>
        </div>
      </footer>
    </div>
  );
}
