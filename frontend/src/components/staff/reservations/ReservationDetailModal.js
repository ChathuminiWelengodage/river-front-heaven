"use client";
import { X, Calendar, User, Phone, CheckCircle, XCircle, CreditCard, BedDouble, FileText } from "lucide-react";
import { Badge } from "@/components/staff/ui/Badge";
import { formatDate } from "./data";

export function ReservationDetailModal({
  reservation,
  onClose,
  onUpdateStatus,
}) {
  if (!reservation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-bold text-ink">
              {reservation.reference}
            </span>
            <Badge status={reservation.status} />
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-lg border border-line text-muted hover:bg-surface hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 px-6 py-5 text-sm">
          {/* Guest Info */}
          <div className="rounded-xl border border-line bg-surface/50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
              <User size={14} /> Guest Details
            </div>
            <div className="mt-2 text-base font-bold text-ink">{reservation.guestName}</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted">
              <Phone size={13} />
              <span>Booked via {reservation.source === "WALK_IN" ? "Walk-in" : "Phone call"}</span>
            </div>
          </div>

          {/* Stay Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <Calendar size={13} /> Check-in
              </div>
              <div className="mt-1 font-bold text-ink">{formatDate(reservation.checkInDate)}</div>
            </div>
            <div className="rounded-xl border border-line p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <Calendar size={13} /> Check-out
              </div>
              <div className="mt-1 font-bold text-ink">{formatDate(reservation.checkOutDate)}</div>
            </div>
          </div>

          {/* Package and Guests */}
          <div className="rounded-xl border border-line p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BedDouble size={16} className="text-brand" />
                <span className="font-bold text-ink">{reservation.packageName} Package</span>
              </div>
              <span className="text-xs font-semibold text-muted">
                {reservation.nights} nights
              </span>
            </div>
            <div className="mt-2 text-xs text-muted">
              Capacity: {reservation.adults} Adults {reservation.children ? `· ${reservation.children} Children` : ""}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3 font-semibold text-ink">
              <span>Total Stay Cost</span>
              <span className="text-base text-brand">
                LKR {(Number(reservation.nightlyRate) * reservation.nights).toLocaleString()}
              </span>
            </div>
            {reservation.advancePayment > 0 && (
              <div className="mt-1 flex items-center justify-between text-xs text-muted">
                <span>Advance Paid</span>
                <span className="font-semibold text-emerald-700">
                  LKR {Number(reservation.advancePayment).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          {reservation.notes && (
            <div className="rounded-xl border border-line bg-surface/30 p-3 text-xs">
              <div className="flex items-center gap-1 font-semibold text-muted">
                <FileText size={13} /> Notes
              </div>
              <p className="mt-1 text-ink">{reservation.notes}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-surface/50 px-6 py-4">
          <div className="flex items-center gap-2">
            {reservation.status !== "CHECKED_IN" && reservation.status !== "CANCELLED" && (
              <button
                type="button"
                onClick={() => {
                  onUpdateStatus(reservation.id, "CHECKED_IN");
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-white transition hover:bg-brand-dark"
              >
                <CheckCircle size={14} /> Check in
              </button>
            )}
            {reservation.status === "PENDING" && (
              <button
                type="button"
                onClick={() => {
                  onUpdateStatus(reservation.id, "CONFIRMED");
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
              >
                <CheckCircle size={14} /> Confirm
              </button>
            )}
            {reservation.status !== "CANCELLED" && (
              <button
                type="button"
                onClick={() => {
                  onUpdateStatus(reservation.id, "CANCELLED");
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50"
              >
                <XCircle size={14} /> Cancel
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink hover:bg-surface"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
