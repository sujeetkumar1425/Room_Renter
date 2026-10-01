import { createFileRoute, redirect } from "@tanstack/react-router";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

type NotificationRow = {
  id: number;
  title: string;
  body: string | null;
  type: string;
  read_at: string | null;
  created_at: string;
};

export const Route = createFileRoute("/notifications")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Notifications — Room Renter" },
      { name: "description", content: "Your Room Renter notifications." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, body, type, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Notifications:", error);
      setItems([]);
    } else {
      setItems((data ?? []) as NotificationRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();

    const channel = supabase
      .channel("room-renter-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => void load(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const markAllRead = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);

    await load();
  };

  return (
    <Page>
      <div className="container-page py-8 sm:py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Messages, reviews and account activity.
              </p>
            </div>
          </div>

          {items.some((item) => !item.read_at) && (
            <Button variant="outline" className="rounded-xl" onClick={markAllRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="card-surface mt-8 flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading notifications...
          </div>
        ) : items.length === 0 ? (
          <div className="card-surface mt-8 p-12 text-center">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-4 font-semibold">You're all caught up</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              New messages and activity will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {items.map((item) => (
              <button
                key={item.id}
                className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                  item.read_at ? "border-border bg-card" : "border-primary/20 bg-primary/5"
                }`}
                onClick={async () => {
                  if (item.read_at) return;
                  await supabase
                    .from("notifications")
                    .update({ read_at: new Date().toISOString() })
                    .eq("id", item.id);
                  setItems((current) =>
                    current.map((notification) =>
                      notification.id === item.id
                        ? { ...notification, read_at: new Date().toISOString() }
                        : notification,
                    ),
                  );
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bell className="h-4 w-4 text-primary" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{item.title}</p>
                    {item.body && <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!item.read_at && (
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}
