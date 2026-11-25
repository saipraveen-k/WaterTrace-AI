"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Bell, BellOff, CheckCheck, AlertTriangle, MapPin, Info } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  incident_id?: string;
  report_id?: string;
  is_read: boolean;
  created_at: string;
}

function NotificationIcon({ type }: { type: string }) {
  if (type.includes("INCIDENT")) return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  if (type.includes("REPORT")) return <Info className="h-5 w-5 text-blue-500" />;
  if (type.includes("AREA")) return <MapPin className="h-5 w-5 text-green-500" />;
  return <Bell className="h-5 w-5 text-slate-400" />;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/auth/login"); return; }
      setToken(session.access_token);

      api.notifications
        .list(session.access_token)
        .then((n) => setNotifications(n as Notification[]))
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, [router]);

  const handleMarkRead = async (id: string) => {
    if (!token) return;
    await api.notifications.markRead(token, id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    if (!token) return;
    setMarkingAll(true);
    await api.notifications.markAllRead(token);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setMarkingAll(false);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} loading={markingAll}>
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <BellOff className="h-14 w-14 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-slate-500">No notifications yet</p>
          <p className="text-sm mt-1">
            You&apos;ll be notified about incidents in areas you follow and updates to your reports.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={cn(
                "cursor-pointer transition-all",
                !n.is_read ? "border-blue-200 bg-blue-50/40" : "hover:bg-slate-50"
              )}
              onClick={() => !n.is_read && handleMarkRead(n.id)}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <NotificationIcon type={n.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm font-medium", !n.is_read ? "text-slate-900" : "text-slate-700")}>
                        {n.title}
                      </p>
                      {!n.is_read && (
                        <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-slate-400">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </span>
                      {n.incident_id && (
                        <Link
                          href={`/incidents/${n.incident_id}`}
                          className="text-xs text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View incident →
                        </Link>
                      )}
                      {n.report_id && (
                        <Link
                          href={`/reports/${n.report_id}`}
                          className="text-xs text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View report →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
