"use client";
import { useState } from "react";
import { Search, Calendar, ChevronDown, MoreHorizontal, Wrench, Info, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/staff/ui/Badge";
import { formatDate } from "./data";

export function ListView({
  reservations,
  maintenance,
  onSwitchToCalendar,
  onUpdateStatus,
  onSelectReservation,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("OCT_2026");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Filter reservations
  const filteredReservations = reservations.filter((r) => {
    // Search query
    const matchSearch =
      r.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.guestName.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter;

    // Booking source filter
    const matchSource = sourceFilter === "ALL" || r.source === sourceFilter;

    // Date range filter
    let matchDate = true;
    if (dateFilter === "OCT_2026") {
      matchDate = r.checkInDate.startsWith("2026-10") || r.checkOutDate.startsWith("2026-10");
    }

    return matchSearch && matchStatus && matchSource && matchDate;
  });

  return (
    <div className="space-y-4">
      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm">
        {/* Search Input */}
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search reference or guest"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-surface/50 pl-10 pr-4 text-sm text-ink outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
          />
        </div>

        {/* Status Dropdown */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 appearance-none rounded-xl border border-line bg-white pl-4 pr-10 text-sm font-medium text-ink outline-none transition hover:bg-surface focus:border-brand"
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CHECKED_IN">Checked-in</option>
            <option value="CHECKED_OUT">Checked-out</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
        </div>

        {/* Date Range Dropdown */}
        <div className="relative">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-11 appearance-none rounded-xl border border-line bg-white pl-9 pr-10 text-sm font-medium text-ink outline-none transition hover:bg-surface focus:border-brand"
          >
            <option value="OCT_2026">1–31 Oct 2026</option>
            <option value="ALL">All dates</option>
            <option value="UPCOMING">All upcoming</option>
          </select>
          <Calendar size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
        </div>

        {/* Booking Source Dropdown */}
        <div className="relative">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-11 appearance-none rounded-xl border border-line bg-white pl-4 pr-10 text-sm font-medium text-ink outline-none transition hover:bg-surface focus:border-brand"
          >
            <option value="ALL">All · Phone / Walk-in</option>
            <option value="PHONE">Phone</option>
            <option value="WALK_IN">Walk-in</option>
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
        </div>
      </div>

      {/* Reservations Table Card */}
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-surface text-xs font-bold text-muted">
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Guest</th>
                <th className="px-6 py-4">Package</th>
                <th className="px-6 py-4">Check-in</th>
                <th className="px-6 py-4">Check-out</th>
                <th className="px-6 py-4">Nights</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted">
                    No reservations match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredReservations.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => onSelectReservation(r)}
                    className="cursor-pointer transition hover:bg-surface/50"
                  >
                    {/* Reference */}
                    <td className="px-6 py-4 font-mono font-bold text-ink">
                      {r.reference}
                    </td>

                    {/* Guest with source subtitle */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-ink">{r.guestName}</div>
                      <div className="text-xs text-muted">
                        {r.source === "WALK_IN" ? "Walk-in" : "Phone"}
                      </div>
                    </td>

                    {/* Package */}
                    <td className="px-6 py-4 text-ink">{r.packageName}</td>

                    {/* Check-in */}
                    <td className="px-6 py-4 text-ink">{formatDate(r.checkInDate)}</td>

                    {/* Check-out */}
                    <td className="px-6 py-4 text-ink">{formatDate(r.checkOutDate)}</td>

                    {/* Nights */}
                    <td className="px-6 py-4 text-ink">{r.nights}</td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      <Badge status={r.status} />
                    </td>

                    {/* Actions Menu */}
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={() => setActiveMenuId(activeMenuId === r.id ? null : r.id)}
                          aria-label="Actions"
                          className="grid size-8 place-items-center rounded-lg border border-transparent text-muted hover:border-line hover:bg-surface hover:text-ink"
                        >
                          <MoreHorizontal size={18} />
                        </button>

                        {/* Dropdown popup */}
                        {activeMenuId === r.id && (
                          <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-line bg-white py-1 shadow-lg ring-1 ring-black/5">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectReservation(r);
                                setActiveMenuId(null);
                              }}
                              className="flex w-full items-center px-4 py-2 text-xs font-semibold text-ink hover:bg-surface"
                            >
                              View details
                            </button>
                            {r.status !== "CHECKED_IN" && r.status !== "CANCELLED" && (
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateStatus(r.id, "CHECKED_IN");
                                  setActiveMenuId(null);
                                }}
                                className="flex w-full items-center gap-1.5 px-4 py-2 text-xs font-semibold text-sky-700 hover:bg-surface"
                              >
                                <CheckCircle size={14} /> Check in guest
                              </button>
                            )}
                            {r.status === "PENDING" && (
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateStatus(r.id, "CONFIRMED");
                                  setActiveMenuId(null);
                                }}
                                className="flex w-full items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-surface"
                              >
                                <CheckCircle size={14} /> Confirm booking
                              </button>
                            )}
                            {r.status !== "CANCELLED" && (
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateStatus(r.id, "CANCELLED");
                                  setActiveMenuId(null);
                                }}
                                className="flex w-full items-center gap-1.5 border-t border-line px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                              >
                                <XCircle size={14} /> Cancel reservation
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="flex items-center justify-between border-t border-line px-6 py-4 text-xs font-semibold text-muted">
          <span>
            Showing {filteredReservations.length} of {reservations.length} reservations
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled
              aria-label="Previous page"
              className="grid size-8 place-items-center rounded-lg border border-line opacity-50"
            >
              &lt;
            </button>
            <span className="grid size-8 place-items-center rounded-lg bg-brand text-xs font-bold text-white">
              1
            </span>
            <button
              disabled
              aria-label="Next page"
              className="grid size-8 place-items-center rounded-lg border border-line opacity-50"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Maintenance Card (matches mockup exactly) */}
      {maintenance.map((m) => (
        <div
          key={m.id}
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface/70 px-6 py-4 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-white text-muted shadow-xs">
              <Wrench size={18} />
            </span>
            <div>
              <div className="text-sm font-bold text-ink">
                {m.reference} · {m.title}
              </div>
              <div className="text-xs text-muted">
                {formatDate(m.startDate).slice(0, 6)}–{formatDate(m.endDate)} · {m.nights} nights blocked · No active stays overlap
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onSwitchToCalendar}
            className="text-xs font-bold text-brand hover:underline"
          >
            Shown in Calendar
          </button>
        </div>
      ))}

      {/* Bottom Info Callout */}
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-white px-6 py-3.5 text-xs text-muted shadow-xs">
        <Info size={15} className="shrink-0 text-brand" />
        <span>One private cabana. Stays and maintenance block availability; cancelled reservations do not.</span>
      </div>
    </div>
  );
}
