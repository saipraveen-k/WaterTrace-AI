import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ISSUE_CATEGORIES = [
  { value: "NO_SUPPLY", label: "No Water Supply" },
  { value: "LOW_PRESSURE", label: "Low Water Pressure" },
  { value: "LEAKAGE", label: "Pipeline Leakage" },
  { value: "DISCOLOURED_WATER", label: "Discoloured Water" },
  { value: "UNUSUAL_SMELL", label: "Unusual Water Smell" },
  { value: "INTERMITTENT_SUPPLY", label: "Intermittent Supply" },
  { value: "INFRASTRUCTURE_DAMAGE", label: "Infrastructure Damage" },
  { value: "OTHER", label: "Other" },
] as const;

export const INCIDENT_STATUSES = [
  { value: "DETECTED", label: "Detected", color: "bg-blue-100 text-blue-800" },
  { value: "NEEDS_REVIEW", label: "Needs Review", color: "bg-yellow-100 text-yellow-800" },
  { value: "UNDER_INVESTIGATION", label: "Under Investigation", color: "bg-orange-100 text-orange-800" },
  { value: "ACTION_INITIATED", label: "Action Initiated", color: "bg-purple-100 text-purple-800" },
  { value: "RESOLVED", label: "Resolved", color: "bg-green-100 text-green-800" },
  { value: "REOPENED", label: "Reopened", color: "bg-red-100 text-red-800" },
  { value: "REJECTED", label: "Rejected", color: "bg-gray-100 text-gray-600" },
] as const;

export function getStatusStyle(status: string) {
  return INCIDENT_STATUSES.find((s) => s.value === status)?.color ?? "bg-gray-100 text-gray-600";
}

export function formatCategory(category: string) {
  return ISSUE_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export function confidenceLabel(score: number) {
  if (score >= 0.7) return "High";
  if (score >= 0.45) return "Moderate";
  return "Low";
}

export function confidenceColor(score: number) {
  if (score >= 0.7) return "text-green-600";
  if (score >= 0.45) return "text-yellow-600";
  return "text-red-500";
}
