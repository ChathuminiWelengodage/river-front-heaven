"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  BedDouble,
  LogIn,
  LogOut,
  UtensilsCrossed,
  Binoculars,
  RefreshCw,
  TrendingUp,
  Wallet,
  AlertCircle,
  ChevronRight,
  Clock,
  Users,
  CheckCircle2,
  CircleDot,
} from "lucide-react";
import { api } from "@/lib/api";
import { useStaff } from "@/lib/staff-context";
import { Card } from "@/components/staff/ui/Card";
import { Badge } from "@/components/staff/ui/Badge";

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt(amount) {
  const n = Number(amount || 0);
  return "Rs. " + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// ── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, iconColor, label, value, sub, loading }) {
  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className={`flex size-10 items-center justify-center rounded-xl ${iconColor}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <div className="text-sm text-muted font-medium">{label}</div>
        {loading ? (
          <div className="mt-1 h-8 w-24 animate-pulse rounded-lg bg-surface" />
        ) : (
          <div className="mt-1 text-2xl font-extrabold text-ink">{value}</div>
        )}
        {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
      </div>
    </Card>
  );
}

// ── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, count }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b border-line mb-3">
      <Icon size={16} className="text-brand" />
      <span className="font-bold text-ink text-sm">{title}</span>
      {count !== undefined && (
        <span className="ml-auto text-xs text-muted font-medium">{count} records</span>
      )}
    </div>
  );
}

// ── Empty Row ────────────────────────────────────────────────────────────────

function EmptyRow({ msg }) {
  return (
    <div className="py-6 text-center text-sm text-muted">{msg}</div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const user = useStaff();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError("");
    try {
      const res = await api("/dashboard/stats");
      setStats(res.data);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    api("/dashboard/stats")
      .then((res) => {
        if (!mounted) return;
        setStats(res.data);
        setLastRefreshed(new Date());
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || "Failed to load dashboard data.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    // Auto-refresh every 2 minutes
    const interval = setInterval(() => {
      if (mounted) load(true);
    }, 2 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [load]);

  const ops = stats?.operations;
  const fin = stats?.financials;
  const cab = stats?.cabana;

  // Revenue breakdown bars
  const revenueItems = fin
    ? [
        { label: "Accommodation", amount: fin.breakdown.accommodation, color: "bg-brand" },
        { label: "Activities", amount: fin.breakdown.activities, color: "bg-sky-500" },
        { label: "Food & Bev", amount: fin.breakdown.foodBeverage, color: "bg-emerald-500" },
        { label: "Bar", amount: fin.breakdown.bar, color: "bg-purple-500" },
      ]
    : [];
  const totalBreakdown = revenueItems.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-extrabold text-ink">
            <LayoutDashboard className="size-8 text-brand" />
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted">
            Welcome, <span className="font-semibold text-ink">{user?.fullName || "Staff"}</span>.
            {stats?.date && (
              <> Live view for <span className="font-medium">{fmtDate(stats.date)}</span>.</>
            )}
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {lastRefreshed && (
        <p className="text-xs text-muted">
          <Clock size={11} className="inline mr-1" />
          Last refreshed: {fmtTime(lastRefreshed)}
        </p>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ── Cabana Status Banner ── */}
      {(loading || cab) && (
        <Card
          className={`p-5 border-l-4 ${
            cab?.status === "OCCUPIED"
              ? "border-l-sky-500 bg-sky-50/40"
              : cab?.status === "AVAILABLE"
              ? "border-l-emerald-500 bg-emerald-50/40"
              : "border-l-amber-500 bg-amber-50/40"
          }`}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <BedDouble size={22} className="text-brand shrink-0" />
              <div>
                <div className="font-bold text-ink text-base">
                  {cab?.name || "The River Cabana"}
                </div>
                {cab?.currentGuest ? (
                  <p className="text-xs text-muted mt-0.5">
                    <span className="font-semibold text-ink">{cab.currentGuest.guestName}</span>
                    {" · "}{cab.currentGuest.packageName}
                    {" · "}{fmtDate(cab.currentGuest.checkInDate)} → {fmtDate(cab.currentGuest.checkOutDate)}
                    {" · "}<span className="font-mono text-brand">{cab.currentGuest.reference}</span>
                  </p>
                ) : (
                  <p className="text-xs text-muted mt-0.5">No active guest checked in.</p>
                )}
              </div>
            </div>
            {loading ? (
              <div className="h-7 w-24 animate-pulse rounded-full bg-surface" />
            ) : (
              <Badge
                status={
                  cab?.status === "OCCUPIED"
                    ? "CHECKED_IN"
                    : cab?.status === "AVAILABLE"
                    ? "ACTIVE"
                    : "PENDING"
                }
              >
                {cab?.status || "—"}
              </Badge>
            )}
          </div>
        </Card>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={LogIn}
          iconColor="bg-emerald-500"
          label="Arrivals Today"
          value={ops?.arrivalsCount ?? "—"}
          sub="Expected check-ins"
          loading={loading}
        />
        <KpiCard
          icon={LogOut}
          iconColor="bg-sky-500"
          label="Departures Today"
          value={ops?.departuresCount ?? "—"}
          sub="Scheduled check-outs"
          loading={loading}
        />
        <KpiCard
          icon={UtensilsCrossed}
          iconColor="bg-amber-500"
          label="Open F&B Orders"
          value={ops?.openFnbOrdersCount ?? "—"}
          sub="Placed & preparing"
          loading={loading}
        />
        <KpiCard
          icon={Binoculars}
          iconColor="bg-purple-500"
          label="Today's Activities"
          value={ops?.todayActivitiesCount ?? "—"}
          sub="Scheduled for today"
          loading={loading}
        />
      </div>

      {/* ── Financial Overview ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          icon={TrendingUp}
          iconColor="bg-brand"
          label="Revenue Today"
          value={fin?.revenueTodayFormatted ?? "—"}
          sub="Payments received today"
          loading={loading}
        />
        <KpiCard
          icon={TrendingUp}
          iconColor="bg-teal-600"
          label="Revenue This Month"
          value={fin?.revenueMonthFormatted ?? "—"}
          sub="Month-to-date collections"
          loading={loading}
        />
        <KpiCard
          icon={Wallet}
          iconColor="bg-red-500"
          label="Outstanding Balances"
          value={fin?.totalOutstandingFormatted ?? "—"}
          sub="Across all active stays"
          loading={loading}
        />
      </div>

      {/* ── Revenue Breakdown Bar ── */}
      {!loading && fin && totalBreakdown > 0 && (
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-bold text-sm text-ink">Revenue Breakdown — MTD</span>
            <span className="text-xs text-muted font-medium">{fin.revenueMonthFormatted}</span>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full gap-0.5">
            {revenueItems
              .filter((i) => i.amount > 0)
              .map((item) => (
                <div
                  key={item.label}
                  className={`${item.color} rounded-full`}
                  style={{ width: `${(item.amount / totalBreakdown) * 100}%` }}
                  title={`${item.label}: ${fmt(item.amount)}`}
                />
              ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-4">
            {revenueItems.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-xs text-muted">
                <span className={`size-2 rounded-full ${item.color}`} />
                <span>{item.label}</span>
                <span className="font-semibold text-ink">{fmt(item.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Main Grid: Arrivals · Departures · Activities · F&B ── */}
      <div className="grid gap-6 xl:grid-cols-2">

        {/* Arrivals */}
        <Card className="p-5">
          <SectionHeader icon={LogIn} title="Today's Arrivals" count={ops?.arrivalsCount} />
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-surface" />
              ))}
            </div>
          ) : !ops?.arrivals?.length ? (
            <EmptyRow msg="No arrivals scheduled for today." />
          ) : (
            <div className="space-y-2">
              {ops.arrivals.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-line bg-surface/60 p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-ink">{r.guestName}</span>
                      <Badge status={r.status} />
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      <span className="font-mono text-brand">{r.reference}</span>
                      {" · "}{r.package}
                      {" · "}<Users size={11} className="inline" /> {r.partySize} guests
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted">
                    <div>{fmtDate(r.checkInDate)}</div>
                    <div className="text-[11px]">→ {fmtDate(r.checkOutDate)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Departures */}
        <Card className="p-5">
          <SectionHeader icon={LogOut} title="Today's Departures" count={ops?.departuresCount} />
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-surface" />
              ))}
            </div>
          ) : !ops?.departures?.length ? (
            <EmptyRow msg="No departures scheduled for today." />
          ) : (
            <div className="space-y-2">
              {ops.departures.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-line bg-surface/60 p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-ink">{r.guestName}</span>
                      <Badge status={r.status} />
                      {r.hasInvoice && (
                        <CheckCircle2 size={14} className="text-emerald-600" title="Invoice issued" />
                      )}
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      <span className="font-mono text-brand">{r.reference}</span>
                      {" · "}{r.package}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted">
                    <div>{fmtDate(r.checkInDate)}</div>
                    <div className="text-[11px]">→ {fmtDate(r.checkOutDate)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Today's Activities */}
        <Card className="p-5">
          <SectionHeader icon={Binoculars} title="Today's Activities" count={ops?.todayActivitiesCount} />
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-surface" />
              ))}
            </div>
          ) : !ops?.todayActivities?.length ? (
            <EmptyRow msg="No activities scheduled for today." />
          ) : (
            <div className="space-y-2">
              {ops.todayActivities.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-xl border border-line bg-surface/60 p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-ink">{a.activityName}</span>
                      <Badge status={a.status} />
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      {a.guestName}
                      {" · "}<Users size={11} className="inline" /> {a.participants} participants
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted">
                    <Clock size={11} className="inline mr-1" />
                    {fmtTime(a.scheduledAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Open F&B Orders */}
        <Card className="p-5">
          <SectionHeader icon={UtensilsCrossed} title="Open Food & Beverage Orders" count={ops?.openFnbOrdersCount} />
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-surface" />
              ))}
            </div>
          ) : !ops?.openFnbOrders?.length ? (
            <EmptyRow msg="No pending F&B orders right now." />
          ) : (
            <div className="space-y-2">
              {ops.openFnbOrders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between rounded-xl border border-line bg-surface/60 p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-ink">{o.guestName}</span>
                      <Badge status={o.status} />
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      <span className="font-mono text-brand">{o.reference}</span>
                      {" · "}{o.itemsCount} item{o.itemsCount !== 1 ? "s" : ""}
                      {" · "}{fmtTime(o.createdAt)}
                    </div>
                  </div>
                  <div className="text-right text-sm font-bold text-ink">
                    {fmt(o.totalCost)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Recent Payments ── */}
      {!loading && fin?.recentPayments?.length > 0 && (
        <Card className="p-5">
          <SectionHeader icon={Wallet} title="Recent Payments" />
          <div className="space-y-2">
            {fin.recentPayments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-line bg-surface/60 p-3"
              >
                <div className="flex items-center gap-3">
                  <CircleDot size={14} className="text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-sm text-ink">{p.guestName}</div>
                    <div className="text-xs text-muted">
                      <span className="font-mono text-brand">{p.reference}</span>
                      {" · "}{p.method}
                      {" · "}{fmtDate(p.paidAt)}
                    </div>
                  </div>
                </div>
                <div className="font-bold text-emerald-700 text-sm">{p.amountFormatted}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <Link
              href="/staff/reports"
              className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
            >
              View full financial report <ChevronRight size={13} />
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
