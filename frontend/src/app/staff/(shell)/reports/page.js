"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  RefreshCw,
  Download,
  FileText,
  Filter,
  BarChart2,
  Wallet,
  Users,
  BedDouble,
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { api, getToken } from "@/lib/api";
import { Button } from "@/components/staff/ui/Button";
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

function pct(n) {
  return `${n ?? 0}%`;
}

// ── Date preset options ──────────────────────────────────────────────────────

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "ytd", label: "Year to Date" },
  { value: "all", label: "All Time" },
  { value: "custom", label: "Custom Range" },
];

const STATUS_OPTS = ["ALL", "PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"];
const SOURCE_OPTS = ["ALL", "PHONE", "WALK_IN"];
const PAYMENT_OPTS = ["ALL", "CASH", "CARD", "BANK_TRANSFER"];
const REPORT_TYPES = [
  { value: "summary", label: "Executive Summary" },
  { value: "operational", label: "Operational & Occupancy" },
  { value: "financial", label: "Financial & Collections" },
];

// ── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({ filters, onChange, onApply, loading }) {
  const [open, setOpen] = useState(false);
  const isCustom = filters.preset === "custom";

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {/* Report type */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-muted">Report Type</label>
          <select
            value={filters.reportType}
            onChange={(e) => onChange("reportType", e.target.value)}
            className="rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {REPORT_TYPES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* Period preset */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-muted">Period</label>
          <select
            value={filters.preset}
            onChange={(e) => onChange("preset", e.target.value)}
            className="rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {PRESETS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Custom dates */}
        {isCustom && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted">From</label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => onChange("from", e.target.value)}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted">To</label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => onChange("to", e.target.value)}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </>
        )}

        {/* More Filters toggle */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink hover:bg-white"
        >
          <Filter size={14} />
          More Filters
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        <Button
          variant="primary"
          onClick={onApply}
          disabled={loading}
          className="h-10 px-5"
        >
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <BarChart2 size={14} />}
          Generate Report
        </Button>
      </div>

      {/* Expanded filters */}
      {open && (
        <div className="mt-3 flex flex-wrap gap-3 border-t border-line pt-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-muted">Status</label>
            <select
              value={filters.status}
              onChange={(e) => onChange("status", e.target.value)}
              className="rounded-xl border border-line bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {STATUS_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-muted">Source</label>
            <select
              value={filters.source}
              onChange={(e) => onChange("source", e.target.value)}
              className="rounded-xl border border-line bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {SOURCE_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-muted">Payment Method</label>
            <select
              value={filters.paymentMethod}
              onChange={(e) => onChange("paymentMethod", e.target.value)}
              className="rounded-xl border border-line bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {PAYMENT_OPTS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── KPI Stat Cell ─────────────────────────────────────────────────────────────

function Stat({ label, value, sub, highlight }) {
  return (
    <div className={`rounded-xl p-4 ${highlight ? "bg-brand text-white" : "bg-surface border border-line"}`}>
      <div className={`text-xs font-semibold ${highlight ? "text-white/70" : "text-muted"}`}>{label}</div>
      <div className={`mt-1 text-xl font-extrabold ${highlight ? "text-white" : "text-ink"}`}>{value}</div>
      {sub && <div className={`text-xs mt-0.5 ${highlight ? "text-white/60" : "text-muted"}`}>{sub}</div>}
    </div>
  );
}

// ── Revenue Bar ───────────────────────────────────────────────────────────────

function RevBar({ label, amount, total, color }) {
  const pctW = total > 0 ? Math.max(1, (amount / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 shrink-0 text-xs font-medium text-muted truncate">{label}</div>
      <div className="flex-1 bg-line rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full transition-all`} style={{ width: `${pctW}%` }} />
      </div>
      <div className="w-32 shrink-0 text-right text-xs font-bold text-ink">{fmt(amount)}</div>
    </div>
  );
}

// ── Summary Report Panel ──────────────────────────────────────────────────────

function SummaryPanel({ data }) {
  const { kpis, operational: op, financial: fin } = data;
  const totalRev = fin.revenue.grossRevenue;

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Gross Revenue" value={fin.revenue.grossRevenueFormatted} sub="Charged to folios" highlight />
        <Stat label="Total Collections" value={fin.collections.totalCollectionsFormatted} sub="Payments received" />
        <Stat label="Outstanding Balances" value={fin.outstanding.totalOutstandingFormatted} sub={`${fin.outstanding.count} reservation(s)`} />
        <Stat label="Occupancy Rate" value={pct(op.occupancy.occupancyRatePercent)} sub={`${op.occupancy.occupiedNights} / ${op.occupancy.availableCabanaNights} nights`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total Bookings" value={kpis.totalBookings} />
        <Stat label="Total Guests" value={kpis.totalGuests} sub={`${op.guestMetrics.totalAdults} adults · ${op.guestMetrics.totalChildren} children`} />
        <Stat label="Avg. Stay Length" value={`${kpis.averageStayLength} nights`} />
        <Stat label="Net Revenue" value={fin.revenue.netRevenueFormatted} sub="After taxes & levies" />
      </div>

      {/* Revenue breakdown */}
      <Card className="p-5">
        <h3 className="font-bold text-sm text-ink mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-brand" />
          Departmental Revenue Breakdown
        </h3>
        <div className="space-y-3">
          <RevBar label="Accommodation" amount={fin.revenue.breakdown.accommodation} total={totalRev} color="bg-brand" />
          <RevBar label="Activities & Safaris" amount={fin.revenue.breakdown.activities} total={totalRev} color="bg-sky-500" />
          <RevBar label="Food & Beverage" amount={fin.revenue.breakdown.foodBeverage} total={totalRev} color="bg-emerald-500" />
          <RevBar label="Bar & Beverages" amount={fin.revenue.breakdown.bar} total={totalRev} color="bg-purple-500" />
          <RevBar label="Adjustments" amount={fin.revenue.breakdown.adjustments} total={totalRev} color="bg-amber-400" />
        </div>
      </Card>

      {/* Collections by method */}
      <Card className="p-5">
        <h3 className="font-bold text-sm text-ink mb-4 flex items-center gap-2">
          <Wallet size={16} className="text-brand" />
          Collections by Payment Method
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.entries(fin.collections.byMethod).map(([method, m]) => (
            <div key={method} className="rounded-xl border border-line bg-surface p-4">
              <div className="text-xs font-semibold text-muted">{method.replace("_", " ")}</div>
              <div className="mt-1 text-lg font-extrabold text-ink">{m.formatted}</div>
              <div className="text-xs text-muted">{m.count} transaction{m.count !== 1 ? "s" : ""}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Package breakdown */}
      {op.packageBreakdown?.length > 0 && (
        <Card className="p-5">
          <h3 className="font-bold text-sm text-ink mb-4 flex items-center gap-2">
            <BedDouble size={16} className="text-brand" />
            Package Performance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="py-2 text-left text-xs font-semibold text-muted">Package</th>
                  <th className="py-2 text-right text-xs font-semibold text-muted">Stays</th>
                  <th className="py-2 text-right text-xs font-semibold text-muted">Nights</th>
                  <th className="py-2 text-right text-xs font-semibold text-muted">Share</th>
                </tr>
              </thead>
              <tbody>
                {op.packageBreakdown.map((pkg) => (
                  <tr key={pkg.packageName} className="border-b border-line/50 last:border-0">
                    <td className="py-2 font-medium text-ink">{pkg.packageName}</td>
                    <td className="py-2 text-right text-muted">{pkg.staysCount}</td>
                    <td className="py-2 text-right text-muted">{pkg.nightsCount}</td>
                    <td className="py-2 text-right font-bold text-ink">{pct(pkg.sharePercent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Operational Report Panel ──────────────────────────────────────────────────

function OperationalPanel({ data }) {
  const { occupancy, guestMetrics, statusBreakdown, sourceBreakdown, activityOperations, reservations } = data;

  return (
    <div className="space-y-6">
      {/* Occupancy KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Occupancy Rate" value={pct(occupancy.occupancyRatePercent)} sub={`${occupancy.occupiedNights} / ${occupancy.availableCabanaNights} nights`} highlight />
        <Stat label="Avg. Length of Stay" value={`${occupancy.averageLengthOfStay} nights`} sub="Per confirmed booking" />
        <Stat label="Total Bookings" value={guestMetrics.totalBookings} />
        <Stat label="Total Guests" value={guestMetrics.totalGuests} sub={`${guestMetrics.totalAdults} adults · ${guestMetrics.totalChildren} children`} />
      </div>

      {/* Status + Source breakdown */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-bold text-sm text-ink mb-3 flex items-center gap-2">
            <Calendar size={15} className="text-brand" /> Booking Status Breakdown
          </h3>
          <div className="space-y-2 text-sm">
            {[
              ["Confirmed", statusBreakdown.confirmed, "text-emerald-700"],
              ["Checked In", statusBreakdown.checkedIn, "text-sky-700"],
              ["Checked Out", statusBreakdown.checkedOut, "text-slate-600"],
              ["Cancelled", statusBreakdown.cancelled, "text-red-600"],
              ["No Show", statusBreakdown.noShow, "text-red-700"],
            ].map(([label, count, cls]) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-muted">{label}</span>
                <span className={`font-bold ${cls}`}>{count}</span>
              </div>
            ))}
            <div className="border-t border-line pt-2 flex justify-between items-center">
              <span className="text-muted text-xs">Cancellation Rate</span>
              <span className="font-bold text-red-600">{pct(statusBreakdown.cancellationRatePercent)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-sm text-ink mb-3 flex items-center gap-2">
            <Users size={15} className="text-brand" /> Booking Source
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-muted">Phone</span>
                <span className="font-bold text-ink">{sourceBreakdown.phone} ({pct(sourceBreakdown.phonePercent)})</span>
              </div>
              <div className="h-2.5 bg-line rounded-full">
                <div className="h-2.5 bg-brand rounded-full" style={{ width: `${sourceBreakdown.phonePercent}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-muted">Walk-in</span>
                <span className="font-bold text-ink">{sourceBreakdown.walkIn} ({pct(sourceBreakdown.walkInPercent)})</span>
              </div>
              <div className="h-2.5 bg-line rounded-full">
                <div className="h-2.5 bg-amber-400 rounded-full" style={{ width: `${sourceBreakdown.walkInPercent}%` }} />
              </div>
            </div>
          </div>

          {activityOperations && (
            <div className="mt-4 border-t border-line pt-4">
              <div className="text-xs font-semibold text-muted mb-2">Activity Operations</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between"><span className="text-muted">Total Booked</span><span className="font-bold text-ink">{activityOperations.totalBookings}</span></div>
                <div className="flex justify-between"><span className="text-muted">Completed</span><span className="font-bold text-emerald-700">{activityOperations.completed}</span></div>
                <div className="flex justify-between"><span className="text-muted">Upcoming</span><span className="font-bold text-sky-700">{activityOperations.booked}</span></div>
                <div className="flex justify-between"><span className="text-muted">Cancelled</span><span className="font-bold text-red-600">{activityOperations.cancelled}</span></div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Reservations table */}
      <Card className="overflow-hidden">
        <div className="bg-surface border-b border-line px-5 py-3 flex items-center justify-between">
          <span className="font-bold text-sm text-ink">Reservation Details</span>
          <span className="text-xs text-muted">{reservations.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface/60">
              <tr className="border-b border-line">
                {["Reference", "Guest", "Package", "Check-in", "Check-out", "Nights", "Guests", "Source", "Status"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reservations.length === 0 ? (
                <tr><td colSpan={9} className="py-8 text-center text-sm text-muted">No reservations found for this period.</td></tr>
              ) : (
                reservations.map((r) => (
                  <tr key={r.id} className="border-b border-line/50 last:border-0 hover:bg-surface/40">
                    <td className="px-4 py-2.5 font-mono text-xs font-bold text-brand">{r.reference}</td>
                    <td className="px-4 py-2.5 font-medium text-ink whitespace-nowrap">{r.guestName}</td>
                    <td className="px-4 py-2.5 text-muted whitespace-nowrap">{r.package}</td>
                    <td className="px-4 py-2.5 text-muted whitespace-nowrap">{fmtDate(r.checkInDate)}</td>
                    <td className="px-4 py-2.5 text-muted whitespace-nowrap">{fmtDate(r.checkOutDate)}</td>
                    <td className="px-4 py-2.5 text-center font-bold text-ink">{r.totalNights}</td>
                    <td className="px-4 py-2.5 text-center text-muted">{r.totalGuests}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{r.source}</td>
                    <td className="px-4 py-2.5"><Badge status={r.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Financial Report Panel ────────────────────────────────────────────────────

function FinancialPanel({ data }) {
  const { revenue, collections, outstanding, invoices, timeline, ledger } = data;
  const totalRev = revenue.grossRevenue;

  return (
    <div className="space-y-6">
      {/* Revenue KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Gross Revenue" value={revenue.grossRevenueFormatted} sub="All charges" highlight />
        <Stat label="Net Revenue" value={revenue.netRevenueFormatted} sub={`Tax: ${revenue.totalTaxFormatted}`} />
        <Stat label="Total Collections" value={collections.totalCollectionsFormatted} sub={`Advance: ${collections.advanceTotalFormatted}`} />
        <Stat label="Outstanding" value={outstanding.totalOutstandingFormatted} sub={`${outstanding.count} reservation(s)`} />
      </div>

      {/* Revenue breakdown */}
      <Card className="p-5">
        <h3 className="font-bold text-sm text-ink mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-brand" /> Revenue Breakdown
        </h3>
        <div className="space-y-3">
          <RevBar label="Accommodation" amount={revenue.breakdown.accommodation} total={totalRev} color="bg-brand" />
          <RevBar label="Activities & Safaris" amount={revenue.breakdown.activities} total={totalRev} color="bg-sky-500" />
          <RevBar label="Food & Beverage" amount={revenue.breakdown.foodBeverage} total={totalRev} color="bg-emerald-500" />
          <RevBar label="Bar & Beverages" amount={revenue.breakdown.bar} total={totalRev} color="bg-purple-500" />
          <RevBar label="Adjustments" amount={revenue.breakdown.adjustments} total={totalRev} color="bg-amber-400" />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
          <span className="text-sm font-bold text-ink">Gross Operating Revenue</span>
          <span className="text-sm font-extrabold text-brand">{revenue.grossRevenueFormatted}</span>
        </div>
      </Card>

      {/* Collections by method */}
      <Card className="p-5">
        <h3 className="font-bold text-sm text-ink mb-4 flex items-center gap-2">
          <Wallet size={16} className="text-brand" /> Collections by Method
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.entries(collections.byMethod).map(([method, m]) => (
            <div key={method} className="rounded-xl border border-line bg-surface p-4">
              <div className="text-xs font-semibold text-muted">{method.replace(/_/g, " ")}</div>
              <div className="mt-1 text-lg font-extrabold text-ink">{m.formatted}</div>
              <div className="text-xs text-muted">{m.count} payment{m.count !== 1 ? "s" : ""}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
          <span className="text-xs text-muted">Advance Deposits</span>
          <span className="text-sm font-bold text-ink">{collections.advanceTotalFormatted}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Settlement Payments</span>
          <span className="text-sm font-bold text-ink">{collections.settlementTotalFormatted}</span>
        </div>
      </Card>

      {/* Revenue timeline */}
      {timeline?.length > 0 && (
        <Card className="p-5">
          <h3 className="font-bold text-sm text-ink mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-brand" /> Daily Collections Timeline
          </h3>
          <div className="overflow-x-auto">
            <div className="flex items-end gap-1 h-24 min-w-max">
              {(() => {
                const maxVal = Math.max(...timeline.map((d) => d.collections || 0), 1);
                return timeline.map((d) => {
                  const h = Math.max(4, Math.round(((d.collections || 0) / maxVal) * 88));
                  return (
                    <div key={d.date} className="flex flex-col items-center gap-1" title={`${fmtDate(d.date)}: ${fmt(d.collections)}`}>
                      <div className="w-5 bg-brand rounded-t" style={{ height: `${h}px` }} />
                      <span className="text-[9px] text-muted rotate-45 origin-left w-10 whitespace-nowrap">{d.date?.slice(5)}</span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </Card>
      )}

      {/* Invoice list */}
      {invoices.count > 0 && (
        <Card className="overflow-hidden">
          <div className="bg-surface border-b border-line px-5 py-3 flex items-center justify-between">
            <span className="font-bold text-sm text-ink flex items-center gap-2">
              <FileText size={15} className="text-brand" /> Issued Invoices
            </span>
            <span className="text-xs text-muted">{invoices.count} invoices</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface/60">
                <tr className="border-b border-line">
                  {["Invoice #", "Guest", "Reference", "Issued", "Total", "Tax", "Paid"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.list.map((inv) => (
                  <tr key={inv.id} className="border-b border-line/50 last:border-0 hover:bg-surface/40">
                    <td className="px-4 py-2.5 font-mono text-xs font-bold text-brand">{inv.invoiceNumber}</td>
                    <td className="px-4 py-2.5 font-medium text-ink">{inv.guestName}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted">{inv.reference}</td>
                    <td className="px-4 py-2.5 text-muted whitespace-nowrap">{fmtDate(inv.issuedAt)}</td>
                    <td className="px-4 py-2.5 font-bold text-ink">{fmt(inv.total)}</td>
                    <td className="px-4 py-2.5 text-muted">{fmt(inv.tax)}</td>
                    <td className="px-4 py-2.5 font-bold text-emerald-700">{fmt(inv.paid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Financial Ledger */}
      <Card className="overflow-hidden">
        <div className="bg-surface border-b border-line px-5 py-3 flex items-center justify-between">
          <span className="font-bold text-sm text-ink">Financial Ledger — Itemized</span>
          <span className="text-xs text-muted">{ledger.length} entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface/60">
              <tr className="border-b border-line">
                {["Ref", "Guest", "Check-in", "Check-out", "Accomm.", "Activ.", "F&B", "Bar", "Adj.", "Total", "Paid", "Balance", "Status"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 ? (
                <tr><td colSpan={13} className="py-8 text-center text-sm text-muted">No data for this period.</td></tr>
              ) : (
                ledger.map((item) => (
                  <tr key={item.id} className="border-b border-line/50 last:border-0 hover:bg-surface/40">
                    <td className="px-3 py-2 font-mono text-xs font-bold text-brand whitespace-nowrap">{item.reference}</td>
                    <td className="px-3 py-2 font-medium text-ink whitespace-nowrap">{item.guestName}</td>
                    <td className="px-3 py-2 text-muted whitespace-nowrap">{fmtDate(item.checkInDate)}</td>
                    <td className="px-3 py-2 text-muted whitespace-nowrap">{fmtDate(item.checkOutDate)}</td>
                    <td className="px-3 py-2 text-xs text-muted">{fmt(item.accommodation)}</td>
                    <td className="px-3 py-2 text-xs text-muted">{fmt(item.activities)}</td>
                    <td className="px-3 py-2 text-xs text-muted">{fmt(item.foodBeverage)}</td>
                    <td className="px-3 py-2 text-xs text-muted">{fmt(item.bar)}</td>
                    <td className="px-3 py-2 text-xs text-muted">{fmt(item.adjustments)}</td>
                    <td className="px-3 py-2 text-xs font-bold text-ink">{fmt(item.total)}</td>
                    <td className="px-3 py-2 text-xs font-bold text-emerald-700">{fmt(item.paid)}</td>
                    <td className={`px-3 py-2 text-xs font-bold ${item.balance > 0 ? "text-red-600" : "text-emerald-700"}`}>{fmt(item.balance)}</td>
                    <td className="px-3 py-2"><Badge status={item.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Main Reports Page ─────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [filters, setFilters] = useState({
    reportType: "summary",
    preset: "this_month",
    from: "",
    to: "",
    status: "ALL",
    source: "ALL",
    paymentMethod: "ALL",
  });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [exporting, setExporting] = useState(false);

  function handleChange(key, val) {
    setFilters((f) => ({ ...f, [key]: val }));
  }

  // Build query params from filters (excluding reportType)
  const buildQuery = useCallback(
    (extra = {}) => {
      const q = new URLSearchParams();
      if (filters.preset && filters.preset !== "custom") q.set("preset", filters.preset);
      if (filters.preset === "custom" && filters.from) q.set("from", filters.from);
      if (filters.preset === "custom" && filters.to) q.set("to", filters.to);
      if (filters.status && filters.status !== "ALL") q.set("status", filters.status);
      if (filters.source && filters.source !== "ALL") q.set("source", filters.source);
      if (filters.paymentMethod && filters.paymentMethod !== "ALL") q.set("paymentMethod", filters.paymentMethod);
      Object.entries(extra).forEach(([k, v]) => q.set(k, v));
      return q.toString();
    },
    [filters]
  );

  const fetchReport = async () => {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const qs = buildQuery();
      const path =
        filters.reportType === "summary"
          ? `/reports/summary?${qs}`
          : filters.reportType === "operational"
          ? `/reports/operational?${qs}`
          : `/reports/financial?${qs}`;
      const res = await api(path);
      setReport({ type: filters.reportType, data: res.data });
    } catch (err) {
      setError(err.message || "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  // Load default on mount
  useEffect(() => {
    let mounted = true;
    const qs = buildQuery();
    const path =
      filters.reportType === "summary"
        ? `/reports/summary?${qs}`
        : filters.reportType === "operational"
        ? `/reports/operational?${qs}`
        : `/reports/financial?${qs}`;

    api(path)
      .then((res) => {
        if (!mounted) return;
        setReport({ type: filters.reportType, data: res.data });
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || "Failed to generate report.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [buildQuery, filters.reportType]);

  async function handleExport(format) {
    setExporting(true);
    setError("");
    try {
      const token = getToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const qs = buildQuery({ type: filters.reportType, download: "true" });
      const url = `${apiUrl}/reports/export/${format}?${qs}`;
      const res = await fetch(url, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to export ${format.toUpperCase()}.`);
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const today = new Date().toISOString().slice(0, 10);
      a.download = `rfh-${filters.reportType}-report-${today}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
      setSuccessMsg(`${format.toUpperCase()} report downloaded successfully!`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setError(err.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  const periodLabel = report?.data?.period
    ? `${fmtDate(report.data.period.from)} — ${fmtDate(report.data.period.to)}`
    : "";

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-extrabold text-ink">
            <TrendingUp className="size-8 text-brand" />
            Reports & Analytics
          </h1>
          <p className="mt-1 text-sm text-muted">
            Operational and financial reporting with filters and export options.
            {periodLabel && <> <span className="font-medium text-ink">{periodLabel}</span>.</>}
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleExport("csv")}
            disabled={exporting || loading || !report}
            className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-40"
          >
            <Download size={15} className="text-emerald-600" />
            Export CSV
          </button>
          <button
            onClick={() => handleExport("pdf")}
            disabled={exporting || loading || !report}
            className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-40"
          >
            <FileText size={15} className="text-sky-600" />
            Export PDF
          </button>
        </div>
      </div>

      {/* ── Alerts ── */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          {error}
          <button onClick={() => setError("")} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 size={16} className="shrink-0" />
          {successMsg}
        </div>
      )}

      {/* ── Filter Bar ── */}
      <FilterBar filters={filters} onChange={handleChange} onApply={fetchReport} loading={loading} />

      {/* ── Report Content ── */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-5">
                <div className="h-5 w-24 animate-pulse rounded bg-surface mb-3" />
                <div className="h-8 w-32 animate-pulse rounded-lg bg-surface" />
              </Card>
            ))}
          </div>
          <Card className="p-5">
            <div className="h-4 w-48 animate-pulse rounded bg-surface mb-4" />
            {[1, 2, 3, 4].map((i) => <div key={i} className="mb-2 h-3 w-full animate-pulse rounded bg-surface" />)}
          </Card>
        </div>
      ) : !report ? (
        <Card className="p-12 text-center text-muted">
          Click <span className="font-semibold text-ink">Generate Report</span> to load data for the selected period.
        </Card>
      ) : (
        <div>
          {report.type === "summary" && <SummaryPanel data={report.data} />}
          {report.type === "operational" && <OperationalPanel data={report.data} />}
          {report.type === "financial" && <FinancialPanel data={report.data} />}
        </div>
      )}
    </div>
  );
}
