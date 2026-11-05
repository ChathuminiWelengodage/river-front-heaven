"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Wrench, Info } from "lucide-react";

export function CalendarView({
  currentDate,
  onNavigateMonth,
  onToday,
  reservations,
  maintenance,
  draftDates,
  onSelectDate,
  onSelectReservation,
}) {
  const [viewMode, setViewMode] = useState("Month");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed (9 for October)
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  // Get days in current month, prev month trailing days, and next month leading days
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const totalDays = lastDayOfMonth.getDate();

  // Day of week for 1st day (0 = Sun, 1 = Mon ... 6 = Sat)
  // We want Mon as column 0, Sun as column 6
  let firstDayCol = (firstDayOfMonth.getDay() + 6) % 7;

  // Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const prevDays = [];
  for (let i = firstDayCol - 1; i >= 0; i--) {
    prevDays.push({
      day: prevMonthLastDay - i,
      month: month - 1,
      year: month === 0 ? year - 1 : year,
      isCurrentMonth: false,
    });
  }

  // Current month days
  const currentMonthDays = [];
  for (let d = 1; d <= totalDays; d++) {
    currentMonthDays.push({
      day: d,
      month,
      year,
      isCurrentMonth: true,
    });
  }

  // Next month leading days to complete grid rows
  const remaining = (7 - ((prevDays.length + currentMonthDays.length) % 7)) % 7;
  const nextDays = [];
  for (let d = 1; d <= remaining; d++) {
    nextDays.push({
      day: d,
      month: month + 1,
      year: month === 11 ? year + 1 : year,
      isCurrentMonth: false,
    });
  }

  const allCalendarDays = [...prevDays, ...currentMonthDays, ...nextDays];

  // Group days into weeks of 7
  const weeks = [];
  for (let i = 0; i < allCalendarDays.length; i += 7) {
    weeks.push(allCalendarDays.slice(i, i + 7));
  }

  // Helper to format date object to YYYY-MM-DD
  const toDateStr = (y, m, d) => {
    const realDate = new Date(y, m, d);
    const yr = realDate.getFullYear();
    const mo = String(realDate.getMonth() + 1).padStart(2, "0");
    const da = String(realDate.getDate()).padStart(2, "0");
    return `${yr}-${mo}-${da}`;
  };

  // Color classes for reservation bars
  const statusColors = {
    CHECKED_IN: "bg-[#e2f1f8] border-l-4 border-[#0284c7] text-[#0369a1]",
    CONFIRMED: "bg-[#e6f4ea] border-l-4 border-[#16a34a] text-[#15803d]",
    CANCELLED: "bg-[#fde8e8] border-l-4 border-[#ef4444] text-[#b91c1c]",
    PENDING: "bg-[#fef3c7] border-l-4 border-[#f59e0b] text-[#b45309]",
  };

  // Check if today matches Oct 3
  const isToday = (dayObj) => dayObj.isCurrentMonth && dayObj.day === 3 && dayObj.month === 9 && dayObj.year === 2026;

  // Check if draft check-in or check-out date
  const isDraftCheckIn = (dateStr) => draftDates?.checkIn === dateStr;
  const isDraftCheckOut = (dateStr) => draftDates?.checkOut === dateStr;

  return (
    <div className="flex flex-col rounded-2xl border border-line bg-white shadow-sm">
      {/* Calendar Top Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-6 py-4">
        {/* Month selector with chevrons */}
        <div className="flex items-center gap-2">
          <span className="text-xl font-extrabold text-ink">
            {monthName} {year}
          </span>
          <div className="flex items-center gap-1 pl-2">
            <button
              onClick={() => onNavigateMonth(-1)}
              aria-label="Previous month"
              className="grid size-8 place-items-center rounded-lg border border-line text-muted transition hover:bg-surface hover:text-ink"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => onNavigateMonth(1)}
              aria-label="Next month"
              className="grid size-8 place-items-center rounded-lg border border-line text-muted transition hover:bg-surface hover:text-ink"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Status Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm border border-amber-500 bg-amber-100" />
            Pending
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm border border-emerald-500 bg-emerald-100" />
            Confirmed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm border border-sky-500 bg-sky-100" />
            Checked-in
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm border border-rose-500 bg-rose-100" />
            Cancelled
          </span>
          <span className="flex items-center gap-1.5">
            <Wrench size={12} className="text-slate-600" />
            Maintenance
          </span>
        </div>

        {/* View Mode & Today Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToday}
            className="rounded-xl border border-line px-3.5 py-1.5 text-xs font-bold text-ink transition hover:bg-surface"
          >
            Today
          </button>
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-xl border border-line px-3.5 py-1.5 text-xs font-bold text-ink transition hover:bg-surface"
            >
              <span>{viewMode}</span>
              <ChevronDown size={14} className="text-muted" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="w-full overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-line bg-surface text-center text-xs font-bold text-muted">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="py-2.5">
                {d}
              </div>
            ))}
          </div>

          {/* Weeks and Days Grid */}
          <div className="divide-y divide-line">
            {weeks.map((week, weekIdx) => {
              // Find reservations and maintenance that span any days in this week
              const weekStartStr = toDateStr(week[0].year, week[0].month, week[0].day);
              const weekEndStr = toDateStr(week[6].year, week[6].month, week[6].day);

              // Night covers checkInDate up to day before checkOutDate
              const activeStaysInWeek = reservations.filter((r) => {
                // Stay nights are from r.checkInDate to the night before r.checkOutDate
                return r.checkInDate <= weekEndStr && r.checkOutDate > weekStartStr;
              });

              const maintenanceInWeek = maintenance.filter((m) => {
                return m.startDate <= weekEndStr && m.endDate > weekStartStr;
              });

              return (
                <div key={weekIdx} className="relative min-h-[105px] select-none">
                  {/* Base 7 Day Cells */}
                  <div className="grid grid-cols-7 divide-x divide-line">
                    {week.map((dObj, dayIdx) => {
                      const dateStr = toDateStr(dObj.year, dObj.month, dObj.day);
                      const draftIn = isDraftCheckIn(dateStr);
                      const draftOut = isDraftCheckOut(dateStr);
                      const today = isToday(dObj);

                      return (
                        <div
                          key={dayIdx}
                          onClick={() => onSelectDate(dateStr)}
                          className={`group relative h-28 cursor-pointer p-2 transition hover:bg-surface/60 ${
                            !dObj.isCurrentMonth ? "bg-surface/30 text-muted/50" : "text-ink"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            {/* Day number with highlights */}
                            {draftIn || draftOut ? (
                              <span className="grid size-6 place-items-center rounded-full bg-[#0b4f5c] text-xs font-bold text-white shadow-sm">
                                {dObj.day}
                              </span>
                            ) : today ? (
                              <span className="grid size-6 place-items-center rounded-full border-2 border-brand font-bold text-brand">
                                {dObj.day}
                              </span>
                            ) : (
                              <span className="text-xs font-semibold">{dObj.day}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Overlaid Event Bars for this week */}
                  <div className="pointer-events-none absolute inset-x-0 top-8 flex flex-col gap-1.5 px-1">
                    {/* Render active reservations */}
                    {activeStaysInWeek.map((r) => {
                      // Calculate colStart (0-6) and span (1-7) within this week
                      let startCol = 0;
                      let endCol = 6;

                      week.forEach((wDay, idx) => {
                        const dStr = toDateStr(wDay.year, wDay.month, wDay.day);
                        if (dStr === r.checkInDate) startCol = idx;
                        // Night ends on day before checkOutDate
                        const nextDayDate = new Date(wDay.year, wDay.month, wDay.day + 1);
                        const nextDayStr = toDateStr(nextDayDate.getFullYear(), nextDayDate.getMonth(), nextDayDate.getDate());
                        if (nextDayStr === r.checkOutDate) endCol = idx;
                      });

                      // Clamp between 0 and 6
                      if (r.checkInDate > weekStartStr) {
                        const idx = week.findIndex((w) => toDateStr(w.year, w.month, w.day) === r.checkInDate);
                        if (idx !== -1) startCol = idx;
                      }
                      if (r.checkOutDate <= weekEndStr) {
                        const checkOutDateObj = new Date(r.checkOutDate);
                        checkOutDateObj.setDate(checkOutDateObj.getDate() - 1);
                        const lastNightStr = toDateStr(checkOutDateObj.getFullYear(), checkOutDateObj.getMonth(), checkOutDateObj.getDate());
                        const idx = week.findIndex((w) => toDateStr(w.year, w.month, w.day) === lastNightStr);
                        if (idx !== -1) endCol = idx;
                      }

                      const colSpan = Math.max(1, endCol - startCol + 1);
                      const leftPercent = (startCol / 7) * 100;
                      const widthPercent = (colSpan / 7) * 100;

                      return (
                        <div
                          key={r.id}
                          style={{
                            left: `calc(${leftPercent}% + 2px)`,
                            width: `calc(${widthPercent}% - 4px)`,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectReservation(r);
                          }}
                          className={`pointer-events-auto relative flex h-7 items-center justify-between rounded-lg px-2 text-xs font-semibold shadow-xs transition hover:opacity-95 ${
                            statusColors[r.status] || "bg-slate-100 text-slate-800"
                          }`}
                        >
                          <span className="truncate pr-1">{r.guestName || "[Guest name]"}</span>
                          <span className="shrink-0 px-1 font-normal opacity-75">{r.packageName}</span>
                          <span className="shrink-0 pl-1 font-mono text-[11px] font-bold">{r.reference}</span>
                        </div>
                      );
                    })}

                    {/* Render Maintenance Block in this week */}
                    {maintenanceInWeek.map((m) => {
                      let startCol = 0;
                      let endCol = 6;

                      const startIdx = week.findIndex((w) => toDateStr(w.year, w.month, w.day) === m.startDate);
                      if (startIdx !== -1) startCol = startIdx;

                      // Maintenance ends on m.endDate (exclusive)
                      const lastNight = new Date(m.endDate);
                      lastNight.setDate(lastNight.getDate() - 1);
                      const lastNightStr = toDateStr(lastNight.getFullYear(), lastNight.getMonth(), lastNight.getDate());
                      const endIdx = week.findIndex((w) => toDateStr(w.year, w.month, w.day) === lastNightStr);
                      if (endIdx !== -1) endCol = endIdx;

                      const colSpan = Math.max(1, endCol - startCol + 1);
                      const leftPercent = (startCol / 7) * 100;
                      const widthPercent = (colSpan / 7) * 100;

                      return (
                        <div
                          key={m.id}
                          style={{
                            left: `calc(${leftPercent}% + 2px)`,
                            width: `calc(${widthPercent}% - 4px)`,
                          }}
                          className="pointer-events-auto relative flex h-7 items-center gap-1.5 rounded-lg border-l-4 border-slate-500 bg-[#eef2f6] px-2 text-xs font-semibold text-slate-700 shadow-xs"
                        >
                          <Wrench size={13} className="text-slate-600" />
                          <span className="truncate">Maintenance {m.reference}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Calendar Bottom Legend & Draft Info Bar */}
      <div className="flex flex-wrap items-center justify-between border-t border-line px-6 py-3 text-xs text-muted">
        <div>Bars cover nights; check-out dates are excluded.</div>
        {draftDates?.checkIn && draftDates?.checkOut && (
          <div className="flex items-center gap-1.5 font-semibold text-ink">
            <span className="size-2 rounded-full bg-brand" />
            <span>
              Draft · {new Date(draftDates.checkIn).getDate()}–{new Date(draftDates.checkOut).getDate()} {monthName.slice(0, 3)} · {Math.max(1, (new Date(draftDates.checkOut) - new Date(draftDates.checkIn)) / (1000 * 60 * 60 * 24))} nights
            </span>
          </div>
        )}
      </div>

      {/* Bottom Notice Callout */}
      <div className="flex items-center gap-2 border-t border-line bg-surface/70 px-6 py-3 text-xs text-muted">
        <Info size={15} className="shrink-0 text-brand" />
        <span>One private cabana. Stays and maintenance block availability; cancelled reservations do not.</span>
      </div>
    </div>
  );
}
