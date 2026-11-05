"use client";
import { useState } from "react";
import { X, Lock, Plus, Minus, Check, AlertTriangle, CheckCircle2, BedDouble } from "lucide-react";
import { calculateNights, checkAvailability } from "./data";

export function NewReservationDrawer({
  open,
  onClose,
  packages,
  guests,
  reservations,
  maintenance,
  initialDates,
  onSaveReservation,
  onAddNewGuest,
}) {
  const [selectedGuestId, setSelectedGuestId] = useState(() => guests?.[0]?.id || 1);
  const [checkIn, setCheckIn] = useState(() => initialDates?.checkIn || "2026-10-23");
  const [checkOut, setCheckOut] = useState(() => initialDates?.checkOut || "2026-10-26");
  const [selectedPackageId, setSelectedPackageId] = useState(2); // Default to Family as in mockup
  const [adults, setAdults] = useState(3);
  const [childrenCount, setChildrenCount] = useState(0);
  const [bookingSource, setBookingSource] = useState("PHONE");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [notes, setNotes] = useState("Arrival time to be confirmed by phone.");
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);

  // New guest quick form state
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestIdNumber, setNewGuestIdNumber] = useState("");
  const [newGuestPhone, setNewGuestPhone] = useState("");
  const [newGuestEmail, setNewGuestEmail] = useState("");
  const [newGuestAddress, setNewGuestAddress] = useState("");

  const activePackage = packages.find((p) => p.id === selectedPackageId) || packages[0] || {
    name: "Family",
    pricePerNight: 22000,
    maxAdults: 4,
    maxChildren: 2,
    maxTotal: 6,
  };

  const nights = calculateNights(checkIn, checkOut);
  const totalAmount = (activePackage.pricePerNight || 0) * nights;

  // Capacity validations
  const totalGuests = adults + childrenCount;
  const isAdultLimitExceeded = adults > activePackage.maxAdults;
  const isChildrenLimitExceeded = childrenCount > activePackage.maxChildren;
  const isTotalLimitExceeded = totalGuests > (activePackage.maxTotal || activePackage.maxAdults + activePackage.maxChildren);

  let capacityWarning = null;
  if (isAdultLimitExceeded) {
    capacityWarning = `${adults} adults exceed the ${activePackage.name} package limit of ${activePackage.maxAdults} adults. Reduce the guest count before saving.`;
  } else if (isChildrenLimitExceeded) {
    capacityWarning = `${childrenCount} children exceed the ${activePackage.name} package limit of ${activePackage.maxChildren} children. Reduce the guest count before saving.`;
  } else if (isTotalLimitExceeded) {
    capacityWarning = `${totalGuests} guests exceed the ${activePackage.name} package limit of ${activePackage.maxTotal || activePackage.maxAdults + activePackage.maxChildren} guests. Reduce the guest count before saving.`;
  }

  // Real-time availability check
  const availability = checkAvailability(checkIn, checkOut, reservations, maintenance);

  const canSave =
    Boolean(selectedGuestId) &&
    nights > 0 &&
    availability.available &&
    !capacityWarning &&
    adults > 0;

  function handleSave() {
    if (!canSave) return;
    const guest = guests.find((g) => g.id === Number(selectedGuestId)) || { fullName: "Guest" };

    const newRes = {
      id: Date.now(),
      reference: `RFH-${String(Math.floor(Math.random() * 900) + 266).padStart(4, "0")}`,
      guestId: Number(selectedGuestId),
      guestName: guest.fullName,
      source: bookingSource,
      packageId: activePackage.id,
      packageName: activePackage.name,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      nights,
      adults,
      children: childrenCount,
      nightlyRate: activePackage.pricePerNight,
      advancePayment: advanceAmount ? Number(advanceAmount) : 0,
      status: "PENDING",
      notes,
    };

    onSaveReservation(newRes);
    onClose();
  }

  function handleCreateQuickGuest(e) {
    e.preventDefault();
    if (!newGuestName.trim()) return;

    const created = {
      id: Date.now(),
      fullName: newGuestName.trim(),
      idNumber: newGuestIdNumber.trim() || `NIC-${Date.now().toString().slice(-6)}`,
      phone: newGuestPhone.trim() || "+94 77 000 0000",
      email: newGuestEmail.trim(),
      address: newGuestAddress.trim() || "Sri Lanka",
    };

    onAddNewGuest(created);
    setSelectedGuestId(created.id);
    setShowAddGuestModal(false);
    // Reset form
    setNewGuestName("");
    setNewGuestIdNumber("");
    setNewGuestPhone("");
    setNewGuestEmail("");
    setNewGuestAddress("");
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[480px] flex-col border-l border-line bg-white shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="text-xl font-extrabold text-ink">New reservation</h2>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
              <BedDouble size={14} />
              <span>One private cabana · Staff booking</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="grid size-9 place-items-center rounded-lg border border-line text-muted transition hover:bg-surface hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Form Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Guest selector */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="guest-select" className="text-sm font-semibold text-ink">
                Guest
              </label>
              <button
                type="button"
                onClick={() => setShowAddGuestModal(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
              >
                <Plus size={14} /> Add new guest
              </button>
            </div>
            <div className="relative">
              <select
                id="guest-select"
                value={selectedGuestId}
                onChange={(e) => setSelectedGuestId(e.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-line bg-white px-3.5 pr-9 text-sm font-medium text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                {guests.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.fullName} {g.phone ? `(${g.phone})` : ""}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                <svg className="size-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Check-in and Check-out */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="check-in-date" className="mb-1.5 block text-xs font-semibold text-ink">
                Check-in
              </label>
              <div className="relative">
                <input
                  id="check-in-date"
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>
            <div>
              <label htmlFor="check-out-date" className="mb-1.5 block text-xs font-semibold text-ink">
                Check-out
              </label>
              <div className="relative">
                <input
                  id="check-out-date"
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>
          </div>

          {/* Availability Status Banner */}
          {availability.available ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              <span>Cabana is available for these dates</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800">
              <AlertTriangle size={16} className="shrink-0 text-red-600" />
              <span>{availability.reason || "Cabana is not available for selected dates."}</span>
            </div>
          )}

          {/* Package Selection */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
              Package
            </label>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-surface p-1">
              {packages.map((pkg) => {
                const isSelected = pkg.id === selectedPackageId;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => {
                      setSelectedPackageId(pkg.id);
                      if (pkg.name === "Couple" && adults > 2) {
                        setAdults(2);
                        setChildrenCount(0);
                      }
                    }}
                    className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition ${
                      isSelected
                        ? "border border-brand/20 bg-white text-ink shadow-sm ring-1 ring-brand/10"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    <span className={`grid size-4 place-items-center rounded-full border ${isSelected ? "border-brand bg-brand text-white" : "border-muted/40"}`}>
                      {isSelected && <Check size={11} strokeWidth={3} />}
                    </span>
                    <span>{pkg.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price per night */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink">
              Price per night
            </label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={`LKR ${Number(activePackage.pricePerNight).toLocaleString()}`}
                className="h-11 w-full rounded-xl border border-line bg-surface px-4 pr-10 text-sm font-semibold text-ink outline-none"
              />
              <Lock size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
            </div>
            <p className="mt-1 text-xs text-muted">
              Automatically filled from the {activePackage.name} package.
            </p>
          </div>

          {/* Guest Count (Adults and Children) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-ink">Adults</span>
              <div className="flex h-11 items-center justify-between rounded-xl border border-line bg-white px-2">
                <button
                  type="button"
                  onClick={() => setAdults((prev) => Math.max(1, prev - 1))}
                  aria-label="Decrease adults"
                  className="grid size-7 place-items-center rounded-lg border border-line text-ink transition hover:bg-surface active:bg-line"
                >
                  <Minus size={14} />
                </button>
                <span className="text-sm font-bold text-ink">{adults}</span>
                <button
                  type="button"
                  onClick={() => setAdults((prev) => prev + 1)}
                  aria-label="Increase adults"
                  className="grid size-7 place-items-center rounded-lg border border-line text-ink transition hover:bg-surface active:bg-line"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-semibold text-ink">Children</span>
              <div className="flex h-11 items-center justify-between rounded-xl border border-line bg-white px-2">
                <button
                  type="button"
                  onClick={() => setChildrenCount((prev) => Math.max(0, prev - 1))}
                  aria-label="Decrease children"
                  className="grid size-7 place-items-center rounded-lg border border-line text-ink transition hover:bg-surface active:bg-line"
                >
                  <Minus size={14} />
                </button>
                <span className="text-sm font-bold text-ink">{childrenCount}</span>
                <button
                  type="button"
                  onClick={() => setChildrenCount((prev) => prev + 1)}
                  aria-label="Increase children"
                  className="grid size-7 place-items-center rounded-lg border border-line text-ink transition hover:bg-surface active:bg-line"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Guest Capacity Warning Banner (matches mockup design) */}
          {capacityWarning && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-700">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />
              <div>
                <span className="font-semibold">{capacityWarning}</span>
              </div>
            </div>
          )}

          {/* Booking Source */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-ink">
              Booking source
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBookingSource("PHONE")}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition ${
                  bookingSource === "PHONE"
                    ? "border-brand/30 bg-brand-soft/60 text-brand-dark"
                    : "border-line bg-white text-ink hover:bg-surface"
                }`}
              >
                <span className={`grid size-4 place-items-center rounded-full border ${bookingSource === "PHONE" ? "border-brand bg-brand text-white" : "border-muted/40"}`}>
                  {bookingSource === "PHONE" && <Check size={11} strokeWidth={3} />}
                </span>
                <span>Phone</span>
              </button>
              <button
                type="button"
                onClick={() => setBookingSource("WALK_IN")}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition ${
                  bookingSource === "WALK_IN"
                    ? "border-brand/30 bg-brand-soft/60 text-brand-dark"
                    : "border-line bg-white text-ink hover:bg-surface"
                }`}
              >
                <span className={`grid size-4 place-items-center rounded-full border ${bookingSource === "WALK_IN" ? "border-brand bg-brand text-white" : "border-muted/40"}`}>
                  {bookingSource === "WALK_IN" && <Check size={11} strokeWidth={3} />}
                </span>
                <span>Walk-in</span>
              </button>
            </div>
          </div>

          {/* Advance payment amount */}
          <div>
            <label htmlFor="advance-amount" className="mb-1.5 block text-xs font-semibold text-ink">
              Advance payment amount
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">
                LKR
              </span>
              <input
                id="advance-amount"
                type="number"
                placeholder="amount"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
                className="h-11 w-full rounded-xl border border-line bg-white pl-12 pr-4 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="reservation-notes" className="mb-1.5 block text-xs font-semibold text-ink">
              Notes
            </label>
            <textarea
              id="reservation-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-line bg-white p-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="border-t border-line bg-white p-5">
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Calculated total</span>
              <span className="font-semibold text-ink">{nights} nights</span>
            </div>
            <div className="mt-1 text-sm font-bold text-ink">
              LKR {Number(activePackage.pricePerNight).toLocaleString()} x {nights} nights ={" "}
              <span className="text-brand">LKR {totalAmount.toLocaleString()}</span>
            </div>
            {capacityWarning && (
              <p className="mt-1.5 text-xs font-semibold text-red-600">
                Resolve the guest capacity warning to save.
              </p>
            )}
            {!availability.available && (
              <p className="mt-1.5 text-xs font-semibold text-red-600">
                Resolve date conflict before saving.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 flex-1 rounded-xl border border-line bg-white text-sm font-bold text-ink transition hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={handleSave}
              className="h-11 flex-[2] rounded-xl bg-accent text-sm font-extrabold text-ink transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save reservation
            </button>
          </div>
        </div>
      </div>

      {/* Quick Add Guest Modal */}
      {showAddGuestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-lg font-bold text-ink">Add New Guest</h3>
              <button
                onClick={() => setShowAddGuestModal(false)}
                className="grid size-8 place-items-center rounded-lg border border-line hover:bg-surface"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateQuickGuest} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">Full Name *</label>
                <input
                  required
                  placeholder="e.g. Kasun Fernando"
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink">NIC / Passport</label>
                  <input
                    placeholder="e.g. 199012345678"
                    value={newGuestIdNumber}
                    onChange={(e) => setNewGuestIdNumber(e.target.value)}
                    className="h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink">Phone</label>
                  <input
                    placeholder="+94 77 ..."
                    value={newGuestPhone}
                    onChange={(e) => setNewGuestPhone(e.target.value)}
                    className="h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">Email</label>
                <input
                  type="email"
                  placeholder="guest@example.com"
                  value={newGuestEmail}
                  onChange={(e) => setNewGuestEmail(e.target.value)}
                  className="h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">Address</label>
                <input
                  placeholder="City, Country"
                  value={newGuestAddress}
                  onChange={(e) => setNewGuestAddress(e.target.value)}
                  className="h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                />
              </div>

              <div className="mt-4 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddGuestModal(false)}
                  className="rounded-lg border border-line px-4 py-2 text-xs font-semibold hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-dark"
                >
                  Save &amp; Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
