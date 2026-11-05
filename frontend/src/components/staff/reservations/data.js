// Initial data and helpers for River Front Heaven Reservations workspace

export const PACKAGES = [
  {
    id: 1,
    name: "Couple",
    pricePerNight: 15000,
    maxAdults: 2,
    maxChildren: 0,
    maxTotal: 2,
    inclusions: ["Breakfast"],
    description: "For two guests in the riverside cabana.",
  },
  {
    id: 2,
    name: "Family",
    pricePerNight: 22000,
    maxAdults: 4,
    maxChildren: 2,
    maxTotal: 6,
    inclusions: ["Breakfast", "Dinner"],
    description: "Spacious riverside stay with extra amenities for family.",
  },
];

export const INITIAL_GUESTS = [
  { id: 1, fullName: "Amal Perera", idNumber: "198823401234", phone: "+94 77 123 4567", email: "amal.perera@example.com", address: "Colombo, Sri Lanka" },
  { id: 2, fullName: "Nimal Fernando", idNumber: "199145607890", phone: "+94 71 987 6543", email: "nimal.f@example.com", address: "Kandy, Sri Lanka" },
  { id: 3, fullName: "Kamal Silva", idNumber: "198534509876", phone: "+94 70 333 4455", email: "kamal.silva@example.com", address: "Galle, Sri Lanka" },
  { id: 4, fullName: "Sunil Jayawardena", idNumber: "197912304567", phone: "+94 76 555 7788", email: "sunil.j@example.com", address: "Negombo, Sri Lanka" },
  { id: 5, fullName: "Chamari Atapattu", idNumber: "199056708901", phone: "+94 72 444 6699", email: "chamari.a@example.com", address: "Kurunegala, Sri Lanka" },
  { id: 6, fullName: "Dinesh Chandimal", idNumber: "198967803456", phone: "+94 77 888 1122", email: "dinesh.c@example.com", address: "Matara, Sri Lanka" },
];

export const INITIAL_RESERVATIONS = [
  {
    id: 1,
    reference: "RFH-0260",
    guestId: 1,
    guestName: "Amal Perera",
    source: "WALK_IN",
    packageId: 1,
    packageName: "Couple",
    checkInDate: "2026-10-02",
    checkOutDate: "2026-10-05",
    nights: 3,
    adults: 2,
    children: 0,
    nightlyRate: 15000,
    advancePayment: 15000,
    status: "CHECKED_IN",
    notes: "Late check-in requested via WhatsApp.",
  },
  {
    id: 2,
    reference: "RFH-0261",
    guestId: 2,
    guestName: "Nimal Fernando",
    source: "PHONE",
    packageId: 1,
    packageName: "Couple",
    checkInDate: "2026-10-08",
    checkOutDate: "2026-10-11",
    nights: 3,
    adults: 2,
    children: 0,
    nightlyRate: 15000,
    advancePayment: 10000,
    status: "CONFIRMED",
    notes: "Requires river-facing safari package details.",
  },
  {
    id: 3,
    reference: "RFH-0262",
    guestId: 3,
    guestName: "Kamal Silva",
    source: "PHONE",
    packageId: 2,
    packageName: "Family",
    checkInDate: "2026-10-09",
    checkOutDate: "2026-10-12",
    nights: 3,
    adults: 3,
    children: 1,
    nightlyRate: 22000,
    advancePayment: 0,
    status: "CANCELLED",
    notes: "Guest cancelled due to unexpected travel schedule change.",
  },
  {
    id: 4,
    reference: "RFH-0263",
    guestId: 4,
    guestName: "Sunil Jayawardena",
    source: "PHONE",
    packageId: 2,
    packageName: "Family",
    checkInDate: "2026-10-13",
    checkOutDate: "2026-10-16",
    nights: 3,
    adults: 4,
    children: 2,
    nightlyRate: 22000,
    advancePayment: 10000,
    status: "PENDING",
    notes: "Awaiting bank transfer confirmation slip.",
  },
  {
    id: 5,
    reference: "RFH-0264",
    guestId: 5,
    guestName: "Chamari Atapattu",
    source: "WALK_IN",
    packageId: 1,
    packageName: "Couple",
    checkInDate: "2026-10-20",
    checkOutDate: "2026-10-23",
    nights: 3,
    adults: 2,
    children: 0,
    nightlyRate: 15000,
    advancePayment: 45000,
    status: "CONFIRMED",
    notes: "Paid in full at front desk.",
  },
  {
    id: 6,
    reference: "RFH-0265",
    guestId: 6,
    guestName: "Dinesh Chandimal",
    source: "PHONE",
    packageId: 2,
    packageName: "Family",
    checkInDate: "2026-10-27",
    checkOutDate: "2026-10-30",
    nights: 3,
    adults: 3,
    children: 1,
    nightlyRate: 22000,
    advancePayment: 15000,
    status: "PENDING",
    notes: "Arrival time to be confirmed by phone.",
  },
];

export const INITIAL_MAINTENANCE = [
  {
    id: 1,
    reference: "MNT-001",
    title: "Cabana maintenance",
    startDate: "2026-10-17",
    endDate: "2026-10-19",
    nights: 2,
    note: "Scheduled deep cleaning and riverside deck timber sealing.",
  },
];

// Format date helper: "2026-10-02" -> "02 Oct 2026"
export function formatDate(dateString) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = String(day).padStart(2, "0");
  const m = months[month - 1];
  return `${d} ${m} ${year}`;
}

// Calculate days between two YYYY-MM-DD dates
export function calculateNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Check availability: does [checkIn, checkOut) conflict with active reservations or maintenance?
export function checkAvailability(checkIn, checkOut, reservations, maintenance, excludeReservationId = null) {
  if (!checkIn || !checkOut || checkIn >= checkOut) {
    return { available: false, reason: "Invalid dates" };
  }

  // Active reservations (PENDING, CONFIRMED, CHECKED_IN) block availability
  // CANCELLED reservations do NOT block availability
  for (const r of reservations) {
    if (excludeReservationId && r.id === excludeReservationId) continue;
    if (r.status === "CANCELLED") continue;

    // Interval overlap: [checkIn, checkOut) intersects [r.checkInDate, r.checkOutDate)
    if (checkIn < r.checkOutDate && checkOut > r.checkInDate) {
      return {
        available: false,
        conflictType: "RESERVATION",
        conflictRef: r.reference,
        reason: `Conflicts with reservation ${r.reference} (${r.guestName})`,
      };
    }
  }

  // Maintenance blocks
  for (const m of maintenance) {
    if (checkIn < m.endDate && checkOut > m.startDate) {
      return {
        available: false,
        conflictType: "MAINTENANCE",
        conflictRef: m.reference,
        reason: `Conflicts with maintenance ${m.reference} (${m.title})`,
      };
    }
  }

  return { available: true };
}
