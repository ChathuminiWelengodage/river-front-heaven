const PDFDocument = require("pdfkit");
const prisma = require("../db");

/**
 * Calculates stay nights between check-in and check-out dates.
 */
function calculateNights(checkInDate, checkOutDate) {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const utc1 = Date.UTC(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
  const utc2 = Date.UTC(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate());
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(1, Math.round((utc2 - utc1) / msPerDay));
}

/**
 * Calculates occupied nights within a specific [from, to] window.
 */
function calculateNightsInWindow(checkInDate, checkOutDate, windowFrom, windowTo) {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const from = windowFrom ? new Date(windowFrom) : checkIn;
  const to = windowTo ? new Date(windowTo) : checkOut;

  const effectiveStart = new Date(Math.max(checkIn.getTime(), from.getTime()));
  const effectiveEnd = new Date(Math.min(checkOut.getTime(), to.getTime()));

  if (effectiveEnd <= effectiveStart) return 0;

  const utc1 = Date.UTC(effectiveStart.getFullYear(), effectiveStart.getMonth(), effectiveStart.getDate());
  const utc2 = Date.UTC(effectiveEnd.getFullYear(), effectiveEnd.getMonth(), effectiveEnd.getDate());
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.round((utc2 - utc1) / msPerDay));
}

/**
 * Formats a currency value as Sri Lankan Rupees (Rs. X,XXX.XX).
 */
function formatCurrency(amount) {
  const num = Number(amount || 0);
  return "Rs. " + num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Normalizes an ISO date string to YYYY-MM-DD.
 */
function toDateString(d) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

/**
 * Resolves date presets into { from, to } strings (YYYY-MM-DD).
 */
function resolveDateRange(preset, from, to) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const format = (d) => d.toISOString().slice(0, 10);

  if (from && to) {
    return { from: toDateString(from), to: toDateString(to) };
  }

  switch (preset) {
    case "today": {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { from: format(today), to: format(tomorrow) };
    }
    case "yesterday": {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      return { from: format(yest), to: format(today) };
    }
    case "7d":
    case "last7days": {
      const past7 = new Date(today);
      past7.setDate(past7.getDate() - 7);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { from: format(past7), to: format(tomorrow) };
    }
    case "30d":
    case "last30days": {
      const past30 = new Date(today);
      past30.setDate(past30.getDate() - 30);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { from: format(past30), to: format(tomorrow) };
    }
    case "this_month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return { from: format(start), to: format(end) };
    }
    case "last_month": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: format(start), to: format(end) };
    }
    case "ytd": {
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear() + 1, 0, 1);
      return { from: format(start), to: format(end) };
    }
    case "all": {
      return { from: "2020-01-01", to: "2030-12-31" };
    }
    default: {
      // Default: current month
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return { from: format(start), to: format(end) };
    }
  }
}

/**
 * Generates system dashboard statistics for live operational and financial views.
 */
async function getDashboardStats(options = {}, db = prisma) {
  const todayStr = toDateString(options.date || new Date());
  const todayDate = new Date(todayStr);
  const tomorrowDate = new Date(todayDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);

  // Month range for MTD calculations
  const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  const nextMonthStart = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 1);

  // 1. Cabana information & status
  let cabana = null;
  if (db.cabana?.findFirst) {
    cabana = await db.cabana.findFirst();
  } else if (db.cabanas && db.cabanas.length > 0) {
    cabana = db.cabanas[0];
  }

  // 2. Active reservations overlapping today
  const activeStaysQuery = {
    where: {
      status: { in: ["CONFIRMED", "CHECKED_IN"] },
      checkInDate: { lte: todayDate },
      checkOutDate: { gt: todayDate },
    },
    include: {
      guest: true,
      package: true,
      payments: true,
      activityBookings: true,
      fnbOrders: true,
      barOrders: true,
      adjustments: true,
    },
  };

  let activeStays = [];
  if (db.reservation?.findMany) {
    activeStays = await db.reservation.findMany(activeStaysQuery);
  } else if (db.reservations) {
    activeStays = db.reservations.filter((r) => {
      const checkIn = new Date(r.checkInDate);
      const checkOut = new Date(r.checkOutDate);
      return (
        ["CONFIRMED", "CHECKED_IN"].includes(r.status) &&
        checkIn <= todayDate &&
        checkOut > todayDate
      );
    });
  }

  // 3. Arrivals today
  let arrivals = [];
  if (db.reservation?.findMany) {
    arrivals = await db.reservation.findMany({
      where: {
        checkInDate: {
          gte: todayDate,
          lt: tomorrowDate,
        },
        status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
      },
      include: { guest: true, package: true },
      orderBy: { createdAt: "desc" },
    });
  } else if (db.reservations) {
    arrivals = db.reservations.filter((r) => {
      const c = toDateString(r.checkInDate);
      return c === todayStr && ["PENDING", "CONFIRMED", "CHECKED_IN"].includes(r.status);
    });
  }

  // 4. Departures today
  let departures = [];
  if (db.reservation?.findMany) {
    departures = await db.reservation.findMany({
      where: {
        checkOutDate: {
          gte: todayDate,
          lt: tomorrowDate,
        },
        status: { in: ["CHECKED_IN", "CHECKED_OUT"] },
      },
      include: { guest: true, package: true, invoice: true, payments: true },
      orderBy: { createdAt: "desc" },
    });
  } else if (db.reservations) {
    departures = db.reservations.filter((r) => {
      const c = toDateString(r.checkOutDate);
      return c === todayStr && ["CHECKED_IN", "CHECKED_OUT"].includes(r.status);
    });
  }

  // 5. Open Food & Beverage Orders
  let openFnbOrders = [];
  if (db.fnbOrder?.findMany) {
    openFnbOrders = await db.fnbOrder.findMany({
      where: { status: { in: ["PLACED", "PREPARING"] } },
      include: {
        reservation: { include: { guest: true } },
        items: { include: { menuItem: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } else if (db.fnbOrders) {
    openFnbOrders = db.fnbOrders.filter((o) => ["PLACED", "PREPARING"].includes(o.status));
  }

  // 6. Today's Scheduled Activities
  let todayActivities = [];
  if (db.activityBooking?.findMany) {
    todayActivities = await db.activityBooking.findMany({
      where: {
        scheduledAt: {
          gte: todayDate,
          lt: tomorrowDate,
        },
        status: { not: "CANCELLED" },
      },
      include: {
        activity: true,
        reservation: { include: { guest: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });
  } else if (db.activityBookings) {
    todayActivities = db.activityBookings.filter((a) => {
      const s = toDateString(a.scheduledAt);
      return s === todayStr && a.status !== "CANCELLED";
    });
  }

  // 7. Today's Payments & MTD Payments
  let allPayments = [];
  if (db.payment?.findMany) {
    allPayments = await db.payment.findMany({
      include: {
        reservation: { include: { guest: true } },
        recordedBy: true,
      },
      orderBy: { paidAt: "desc" },
    });
  } else if (db.payments) {
    allPayments = db.payments;
  }

  let revenueToday = 0;
  let revenueMonth = 0;
  const paymentsTodayList = [];

  for (const pay of allPayments) {
    const payDate = new Date(pay.paidAt);
    const payAmt = Number(pay.amount || 0);
    const payDateStr = toDateString(payDate);

    if (payDateStr === todayStr) {
      revenueToday += payAmt;
      paymentsTodayList.push(pay);
    }
    if (payDate >= monthStart && payDate < nextMonthStart) {
      revenueMonth += payAmt;
    }
  }

  // 8. Outstanding balances across active stays
  let totalOutstanding = 0;
  let activeInHouseCount = 0;

  // Let's also fetch all active/in-house reservations to compute total unpaid balances
  let allActiveReservations = [];
  if (db.reservation?.findMany) {
    allActiveReservations = await db.reservation.findMany({
      where: { status: { in: ["CONFIRMED", "CHECKED_IN"] } },
      include: {
        guest: true,
        package: true,
        payments: true,
        activityBookings: true,
        fnbOrders: true,
        barOrders: true,
        adjustments: true,
      },
    });
  } else if (db.reservations) {
    allActiveReservations = db.reservations.filter((r) =>
      ["CONFIRMED", "CHECKED_IN"].includes(r.status)
    );
  }

  activeInHouseCount = allActiveReservations.filter((r) => r.status === "CHECKED_IN").length;

  for (const r of allActiveReservations) {
    const nights = calculateNights(r.checkInDate, r.checkOutDate);
    const accommodation = nights * Number(r.nightlyRate || 0);

    const activitiesCost = (r.activityBookings || [])
      .filter((a) => a.status !== "CANCELLED")
      .reduce((sum, a) => sum + Number(a.totalCharge || 0), 0);

    const fnbCost = (r.fnbOrders || [])
      .filter((o) => o.status !== "CANCELLED")
      .reduce((sum, o) => sum + Number(o.totalCost || 0), 0);

    const barCost = (r.barOrders || []).reduce(
      (sum, b) => sum + Number(b.totalCost || 0),
      0
    );

    const adjCost = (r.adjustments || []).reduce(
      (sum, adj) => sum + Number(adj.amount || 0),
      0
    );

    const payments = (r.payments || []).reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );

    const folioTotal = accommodation + activitiesCost + fnbCost + barCost + adjCost;
    const balance = Math.max(0, folioTotal - payments);
    totalOutstanding += balance;
  }

  // Determine cabana operational state
  let cabanaState = cabana?.status || "AVAILABLE";
  let currentStay = null;
  if (activeStays.length > 0) {
    currentStay = activeStays[0];
    if (currentStay.status === "CHECKED_IN") {
      cabanaState = "OCCUPIED";
    }
  }

  // MTD department revenue aggregation
  let monthAccommodation = 0;
  let monthActivities = 0;
  let monthFnb = 0;
  let monthBar = 0;

  // Compute month charges
  let monthReservations = [];
  if (db.reservation?.findMany) {
    monthReservations = await db.reservation.findMany({
      where: {
        status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
        checkInDate: { lt: nextMonthStart },
        checkOutDate: { gt: monthStart },
      },
      include: {
        activityBookings: true,
        fnbOrders: true,
        barOrders: true,
      },
    });
  } else if (db.reservations) {
    monthReservations = db.reservations.filter((r) => {
      const cIn = new Date(r.checkInDate);
      const cOut = new Date(r.checkOutDate);
      return (
        ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(r.status) &&
        cIn < nextMonthStart &&
        cOut > monthStart
      );
    });
  }

  for (const res of monthReservations) {
    const nightsInMonth = calculateNightsInWindow(
      res.checkInDate,
      res.checkOutDate,
      monthStart,
      nextMonthStart
    );
    monthAccommodation += nightsInMonth * Number(res.nightlyRate || 0);

    (res.activityBookings || []).forEach((act) => {
      if (act.status !== "CANCELLED") {
        const actDate = new Date(act.scheduledAt);
        if (actDate >= monthStart && actDate < nextMonthStart) {
          monthActivities += Number(act.totalCharge || 0);
        }
      }
    });

    (res.fnbOrders || []).forEach((fnb) => {
      if (fnb.status !== "CANCELLED") {
        const orderDate = new Date(fnb.createdAt);
        if (orderDate >= monthStart && orderDate < nextMonthStart) {
          monthFnb += Number(fnb.totalCost || 0);
        }
      }
    });

    (res.barOrders || []).forEach((bar) => {
      const barDate = new Date(bar.createdAt);
      if (barDate >= monthStart && barDate < nextMonthStart) {
        monthBar += Number(bar.totalCost || 0);
      }
    });
  }

  const grossMonthRevenue = monthAccommodation + monthActivities + monthFnb + monthBar;

  return {
    date: todayStr,
    cabana: {
      id: cabana?.id || 1,
      name: cabana?.name || "The River Cabana",
      status: cabanaState,
      currentGuest: currentStay
        ? {
            id: currentStay.id,
            reference: currentStay.reference,
            guestName: currentStay.guest?.fullName || "Guest",
            packageName: currentStay.package?.name || "Package",
            checkInDate: toDateString(currentStay.checkInDate),
            checkOutDate: toDateString(currentStay.checkOutDate),
            status: currentStay.status,
          }
        : null,
    },
    operations: {
      inHouseStaysCount: activeInHouseCount,
      arrivalsCount: arrivals.length,
      departuresCount: departures.length,
      openFnbOrdersCount: openFnbOrders.length,
      todayActivitiesCount: todayActivities.length,
      arrivals: arrivals.map((r) => ({
        id: r.id,
        reference: r.reference,
        guestName: r.guest?.fullName || "Guest",
        phone: r.guest?.phone,
        package: r.package?.name,
        partySize: (r.adults || 0) + (r.children || 0),
        status: r.status,
        checkInDate: toDateString(r.checkInDate),
        checkOutDate: toDateString(r.checkOutDate),
      })),
      departures: departures.map((r) => ({
        id: r.id,
        reference: r.reference,
        guestName: r.guest?.fullName || "Guest",
        package: r.package?.name,
        status: r.status,
        checkInDate: toDateString(r.checkInDate),
        checkOutDate: toDateString(r.checkOutDate),
        hasInvoice: Boolean(r.invoice),
      })),
      todayActivities: todayActivities.map((a) => ({
        id: a.id,
        activityName: a.activity?.name || "Activity",
        guestName: a.reservation?.guest?.fullName || "Guest",
        scheduledAt: a.scheduledAt,
        participants: a.participants,
        status: a.status,
      })),
      openFnbOrders: openFnbOrders.map((o) => ({
        id: o.id,
        guestName: o.reservation?.guest?.fullName || "Guest",
        reference: o.reservation?.reference,
        status: o.status,
        totalCost: Number(o.totalCost || 0),
        itemsCount: (o.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0),
        createdAt: o.createdAt,
      })),
    },
    financials: {
      revenueToday,
      revenueTodayFormatted: formatCurrency(revenueToday),
      revenueMonth: revenueMonth > 0 ? revenueMonth : grossMonthRevenue,
      revenueMonthFormatted: formatCurrency(revenueMonth > 0 ? revenueMonth : grossMonthRevenue),
      totalOutstanding,
      totalOutstandingFormatted: formatCurrency(totalOutstanding),
      grossMonthRevenue,
      grossMonthRevenueFormatted: formatCurrency(grossMonthRevenue),
      breakdown: {
        accommodation: monthAccommodation,
        activities: monthActivities,
        foodBeverage: monthFnb,
        bar: monthBar,
      },
      recentPayments: allPayments.slice(0, 5).map((p) => ({
        id: p.id,
        amount: Number(p.amount || 0),
        amountFormatted: formatCurrency(p.amount),
        method: p.method,
        paidAt: p.paidAt,
        guestName: p.reservation?.guest?.fullName || "Guest",
        reference: p.reservation?.reference,
      })),
    },
  };
}

/**
 * Generates the Operational & Occupancy Report.
 */
async function getOperationalReport(filters = {}, db = prisma) {
  const { from, to } = resolveDateRange(filters.preset, filters.from, filters.to);
  const fromDate = new Date(from);
  const toDate = new Date(to);

  const msPerDay = 1000 * 60 * 60 * 24;
  const totalDays = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / msPerDay));

  // Fetch reservations in window
  const query = {
    where: {
      checkOutDate: { gt: fromDate },
      checkInDate: { lt: toDate },
      ...(filters.status && filters.status !== "ALL" ? { status: filters.status } : {}),
      ...(filters.source && filters.source !== "ALL" ? { source: filters.source } : {}),
      ...(filters.packageId ? { packageId: Number(filters.packageId) } : {}),
    },
    include: {
      guest: true,
      package: true,
      cabana: true,
      activityBookings: { include: { activity: true } },
      fnbOrders: { include: { items: true } },
      barOrders: { include: { barItem: true } },
      payments: true,
      invoice: true,
    },
    orderBy: { checkInDate: "asc" },
  };

  let reservations = [];
  if (db.reservation?.findMany) {
    reservations = await db.reservation.findMany(query);
  } else if (db.reservations) {
    reservations = db.reservations.filter((r) => {
      const cIn = new Date(r.checkInDate);
      const cOut = new Date(r.checkOutDate);
      const matchesDate = cOut > fromDate && cIn < toDate;
      const matchesStatus = !filters.status || filters.status === "ALL" || r.status === filters.status;
      const matchesSource = !filters.source || filters.source === "ALL" || r.source === filters.source;
      const matchesPkg = !filters.packageId || r.packageId === Number(filters.packageId);
      return matchesDate && matchesStatus && matchesSource && matchesPkg;
    });
  }

  // Calculate Operational Metrics
  let totalOccupiedNights = 0;
  let totalAdults = 0;
  let totalChildren = 0;
  let confirmedCount = 0;
  let checkedInCount = 0;
  let checkedOutCount = 0;
  let cancelledCount = 0;
  let noShowCount = 0;
  let phoneSourceCount = 0;
  let walkInSourceCount = 0;

  const packageCounts = {};
  const itemizedReservations = [];

  for (const r of reservations) {
    const isOccupying = ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(r.status);
    const nightsInWin = isOccupying ? calculateNightsInWindow(r.checkInDate, r.checkOutDate, from, to) : 0;
    const totalStayNights = calculateNights(r.checkInDate, r.checkOutDate);

    totalOccupiedNights += nightsInWin;
    totalAdults += Number(r.adults || 0);
    totalChildren += Number(r.children || 0);

    if (r.status === "CONFIRMED") confirmedCount++;
    else if (r.status === "CHECKED_IN") checkedInCount++;
    else if (r.status === "CHECKED_OUT") checkedOutCount++;
    else if (r.status === "CANCELLED") cancelledCount++;
    else if (r.status === "NO_SHOW") noShowCount++;

    if (r.source === "PHONE") phoneSourceCount++;
    else if (r.source === "WALK_IN") walkInSourceCount++;

    const pkgName = r.package?.name || (r.packageId === 1 ? "Couple" : "Family");
    if (!packageCounts[pkgName]) {
      packageCounts[pkgName] = { count: 0, nights: 0 };
    }
    packageCounts[pkgName].count++;
    packageCounts[pkgName].nights += nightsInWin;

    itemizedReservations.push({
      id: r.id,
      reference: r.reference,
      guestName: r.guest?.fullName || "Guest",
      idNumber: r.guest?.idNumber || "N/A",
      phone: r.guest?.phone || "N/A",
      package: pkgName,
      checkInDate: toDateString(r.checkInDate),
      checkOutDate: toDateString(r.checkOutDate),
      totalNights: totalStayNights,
      nightsInPeriod: nightsInWin,
      adults: r.adults,
      children: r.children,
      totalGuests: (r.adults || 0) + (r.children || 0),
      source: r.source,
      status: r.status,
      nightlyRate: Number(r.nightlyRate || 0),
    });
  }

  // Cabana count (default 1 for River Front Heaven)
  const cabanaCount = 1;
  const availableCabanaNights = totalDays * cabanaCount;
  const occupancyRate = availableCabanaNights > 0
    ? Math.min(100, Math.round((totalOccupiedNights / availableCabanaNights) * 1000) / 10)
    : 0;

  const totalBookings = reservations.length;
  const validStaysCount = confirmedCount + checkedInCount + checkedOutCount;
  const alos = validStaysCount > 0
    ? Math.round((totalOccupiedNights / validStaysCount) * 10) / 10
    : 0;

  const cancellationRate = totalBookings > 0
    ? Math.round(((cancelledCount + noShowCount) / totalBookings) * 1000) / 10
    : 0;

  // Activities operational stats
  let allActivities = [];
  if (db.activityBooking?.findMany) {
    allActivities = await db.activityBooking.findMany({
      where: {
        scheduledAt: { gte: fromDate, lt: toDate },
      },
      include: { activity: true },
    });
  } else if (db.activityBookings) {
    allActivities = db.activityBookings.filter((a) => {
      const s = new Date(a.scheduledAt);
      return s >= fromDate && s < toDate;
    });
  }

  const activityStats = {
    totalBookings: allActivities.length,
    completed: allActivities.filter((a) => a.status === "COMPLETED").length,
    booked: allActivities.filter((a) => a.status === "BOOKED").length,
    cancelled: allActivities.filter((a) => a.status === "CANCELLED").length,
    totalParticipants: allActivities.reduce((s, a) => s + (a.participants || 0), 0),
  };

  return {
    period: { from, to, totalDays },
    occupancy: {
      availableCabanaNights,
      occupiedNights: totalOccupiedNights,
      occupancyRatePercent: occupancyRate,
      averageLengthOfStay: alos,
    },
    guestMetrics: {
      totalBookings,
      totalGuests: totalAdults + totalChildren,
      totalAdults,
      totalChildren,
      averagePartySize: totalBookings > 0 ? Math.round(((totalAdults + totalChildren) / totalBookings) * 10) / 10 : 0,
    },
    statusBreakdown: {
      confirmed: confirmedCount,
      checkedIn: checkedInCount,
      checkedOut: checkedOutCount,
      cancelled: cancelledCount,
      noShow: noShowCount,
      cancellationRatePercent: cancellationRate,
    },
    sourceBreakdown: {
      phone: phoneSourceCount,
      phonePercent: totalBookings > 0 ? Math.round((phoneSourceCount / totalBookings) * 100) : 0,
      walkIn: walkInSourceCount,
      walkInPercent: totalBookings > 0 ? Math.round((walkInSourceCount / totalBookings) * 100) : 0,
    },
    packageBreakdown: Object.entries(packageCounts).map(([name, data]) => ({
      packageName: name,
      staysCount: data.count,
      nightsCount: data.nights,
      sharePercent: totalOccupiedNights > 0 ? Math.round((data.nights / totalOccupiedNights) * 100) : 0,
    })),
    activityOperations: activityStats,
    reservations: itemizedReservations,
  };
}

/**
 * Generates the Financial Report.
 */
async function getFinancialReport(filters = {}, db = prisma) {
  const { from, to } = resolveDateRange(filters.preset, filters.from, filters.to);
  const fromDate = new Date(from);
  const toDate = new Date(to);

  // 1. Fetch reservations in the period
  let reservations = [];
  const resQuery = {
    where: {
      checkOutDate: { gt: fromDate },
      checkInDate: { lt: toDate },
      ...(filters.status && filters.status !== "ALL" ? { status: filters.status } : {}),
    },
    include: {
      guest: true,
      package: true,
      activityBookings: { include: { activity: true } },
      fnbOrders: { include: { items: { include: { menuItem: true } } } },
      barOrders: { include: { barItem: true } },
      adjustments: true,
      payments: true,
      invoice: true,
    },
    orderBy: { checkInDate: "asc" },
  };

  if (db.reservation?.findMany) {
    reservations = await db.reservation.findMany(resQuery);
  } else if (db.reservations) {
    reservations = db.reservations.filter((r) => {
      const cIn = new Date(r.checkInDate);
      const cOut = new Date(r.checkOutDate);
      return cOut > fromDate && cIn < toDate && (!filters.status || filters.status === "ALL" || r.status === filters.status);
    });
  }

  // 2. Fetch payments in the period
  let payments = [];
  const paymentQuery = {
    where: {
      paidAt: { gte: fromDate, lt: toDate },
      ...(filters.paymentMethod && filters.paymentMethod !== "ALL" ? { method: filters.paymentMethod } : {}),
    },
    include: {
      reservation: { include: { guest: true } },
      recordedBy: true,
    },
    orderBy: { paidAt: "asc" },
  };

  if (db.payment?.findMany) {
    payments = await db.payment.findMany(paymentQuery);
  } else if (db.payments) {
    payments = db.payments.filter((p) => {
      const pd = new Date(p.paidAt);
      const matchesDate = pd >= fromDate && pd < toDate;
      const matchesMethod = !filters.paymentMethod || filters.paymentMethod === "ALL" || p.method === filters.paymentMethod;
      return matchesDate && matchesMethod;
    });
  }

  // 3. Fetch Invoices in the period
  let invoices = [];
  const invoiceQuery = {
    where: {
      issuedAt: { gte: fromDate, lt: toDate },
    },
    include: {
      reservation: { include: { guest: true } },
      issuedBy: true,
    },
    orderBy: { issuedAt: "desc" },
  };

  if (db.invoice?.findMany) {
    invoices = await db.invoice.findMany(invoiceQuery);
  } else if (db.invoices) {
    invoices = db.invoices.filter((i) => {
      const idt = new Date(i.issuedAt);
      return idt >= fromDate && idt < toDate;
    });
  }

  // Compute departmental revenue
  let totalAccommodationRevenue = 0;
  let totalActivitiesRevenue = 0;
  let totalFnbRevenue = 0;
  let totalBarRevenue = 0;
  let totalAdjustments = 0;
  let totalTax = 0;

  const itemizedLedger = [];

  for (const r of reservations) {
    // Only count revenue for stays that are not cancelled or no-show
    if (["CANCELLED", "NO_SHOW"].includes(r.status)) continue;

    const nightsInPeriod = calculateNightsInWindow(r.checkInDate, r.checkOutDate, from, to);
    const roomRevenue = nightsInPeriod * Number(r.nightlyRate || 0);
    totalAccommodationRevenue += roomRevenue;

    const actRev = (r.activityBookings || [])
      .filter((a) => a.status !== "CANCELLED")
      .filter((a) => {
        const d = new Date(a.scheduledAt);
        return d >= fromDate && d < toDate;
      })
      .reduce((sum, a) => sum + Number(a.totalCharge || 0), 0);
    totalActivitiesRevenue += actRev;

    const fnbRev = (r.fnbOrders || [])
      .filter((o) => o.status !== "CANCELLED")
      .filter((o) => {
        const d = new Date(o.createdAt);
        return d >= fromDate && d < toDate;
      })
      .reduce((sum, o) => sum + Number(o.totalCost || 0), 0);
    totalFnbRevenue += fnbRev;

    const barRev = (r.barOrders || [])
      .filter((b) => {
        const d = new Date(b.createdAt);
        return d >= fromDate && d < toDate;
      })
      .reduce((sum, b) => sum + Number(b.totalCost || 0), 0);
    totalBarRevenue += barRev;

    const adjRev = (r.adjustments || [])
      .filter((adj) => {
        const d = new Date(adj.createdAt);
        return d >= fromDate && d < toDate;
      })
      .reduce((sum, adj) => sum + Number(adj.amount || 0), 0);
    totalAdjustments += adjRev;

    const stayPayments = (r.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const stayTotal = roomRevenue + actRev + fnbRev + barRev + adjRev;
    const balance = stayTotal - stayPayments;

    itemizedLedger.push({
      id: r.id,
      reference: r.reference,
      guestName: r.guest?.fullName || "Guest",
      checkInDate: toDateString(r.checkInDate),
      checkOutDate: toDateString(r.checkOutDate),
      status: r.status,
      accommodation: roomRevenue,
      activities: actRev,
      foodBeverage: fnbRev,
      bar: barRev,
      adjustments: adjRev,
      total: stayTotal,
      paid: stayPayments,
      balance: balance,
      invoiceNumber: r.invoice?.invoiceNumber || null,
    });
  }

  // Taxes from issued invoices
  totalTax = invoices.reduce((sum, inv) => sum + Number(inv.taxAmount || 0), 0);

  const grossRevenue =
    totalAccommodationRevenue +
    totalActivitiesRevenue +
    totalFnbRevenue +
    totalBarRevenue +
    totalAdjustments;

  const netRevenue = grossRevenue - totalTax;

  // Payments breakdown
  let cashTotal = 0;
  let cashCount = 0;
  let cardTotal = 0;
  let cardCount = 0;
  let bankTotal = 0;
  let bankCount = 0;
  let advanceTotal = 0;
  let settlementTotal = 0;

  for (const p of payments) {
    const amt = Number(p.amount || 0);
    if (p.method === "CASH") {
      cashTotal += amt;
      cashCount++;
    } else if (p.method === "CARD") {
      cardTotal += amt;
      cardCount++;
    } else if (p.method === "BANK_TRANSFER") {
      bankTotal += amt;
      bankCount++;
    }

    if (p.isAdvance) advanceTotal += amt;
    else settlementTotal += amt;
  }

  const totalCollections = cashTotal + cardTotal + bankTotal;

  // Outstanding balances calculation (all active stays)
  const outstandingList = itemizedLedger.filter((item) => item.balance > 0);
  const totalOutstanding = outstandingList.reduce((sum, item) => sum + item.balance, 0);

  // Daily timeline breakdown for charts
  const timelineMap = {};
  for (const p of payments) {
    const day = toDateString(p.paidAt);
    if (!timelineMap[day]) {
      timelineMap[day] = { date: day, collections: 0, revenue: 0 };
    }
    timelineMap[day].collections += Number(p.amount || 0);
  }

  for (const leg of itemizedLedger) {
    const day = leg.checkInDate;
    if (!timelineMap[day]) {
      timelineMap[day] = { date: day, collections: 0, revenue: 0 };
    }
    timelineMap[day].revenue += leg.total;
  }

  const timeline = Object.values(timelineMap).sort((a, b) => a.date.localeCompare(b.date));

  return {
    period: { from, to },
    revenue: {
      grossRevenue,
      grossRevenueFormatted: formatCurrency(grossRevenue),
      netRevenue,
      netRevenueFormatted: formatCurrency(netRevenue),
      totalTax,
      totalTaxFormatted: formatCurrency(totalTax),
      breakdown: {
        accommodation: totalAccommodationRevenue,
        accommodationFormatted: formatCurrency(totalAccommodationRevenue),
        activities: totalActivitiesRevenue,
        activitiesFormatted: formatCurrency(totalActivitiesRevenue),
        foodBeverage: totalFnbRevenue,
        foodBeverageFormatted: formatCurrency(totalFnbRevenue),
        bar: totalBarRevenue,
        barFormatted: formatCurrency(totalBarRevenue),
        adjustments: totalAdjustments,
        adjustmentsFormatted: formatCurrency(totalAdjustments),
      },
    },
    collections: {
      totalCollections,
      totalCollectionsFormatted: formatCurrency(totalCollections),
      advanceTotal,
      advanceTotalFormatted: formatCurrency(advanceTotal),
      settlementTotal,
      settlementTotalFormatted: formatCurrency(settlementTotal),
      byMethod: {
        CASH: { total: cashTotal, count: cashCount, formatted: formatCurrency(cashTotal) },
        CARD: { total: cardTotal, count: cardCount, formatted: formatCurrency(cardTotal) },
        BANK_TRANSFER: { total: bankTotal, count: bankCount, formatted: formatCurrency(bankTotal) },
      },
    },
    outstanding: {
      totalOutstanding,
      totalOutstandingFormatted: formatCurrency(totalOutstanding),
      count: outstandingList.length,
      items: outstandingList,
    },
    invoices: {
      count: invoices.length,
      totalInvoiced: invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0),
      totalTaxInvoiced: invoices.reduce((sum, inv) => sum + Number(inv.taxAmount || 0), 0),
      list: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        guestName: inv.reservation?.guest?.fullName || "Guest",
        reference: inv.reservation?.reference,
        issuedAt: toDateString(inv.issuedAt),
        total: Number(inv.total || 0),
        tax: Number(inv.taxAmount || 0),
        paid: Number(inv.totalPaid || 0),
      })),
    },
    timeline,
    ledger: itemizedLedger,
  };
}

/**
 * Combined Executive Summary.
 */
async function getReportSummary(filters = {}, db = prisma) {
  const [operational, financial] = await Promise.all([
    getOperationalReport(filters, db),
    getFinancialReport(filters, db),
  ]);

  return {
    period: operational.period,
    kpis: {
      grossRevenue: financial.revenue.grossRevenue,
      grossRevenueFormatted: financial.revenue.grossRevenueFormatted,
      totalCollections: financial.collections.totalCollections,
      totalCollectionsFormatted: financial.collections.totalCollectionsFormatted,
      totalOutstanding: financial.outstanding.totalOutstanding,
      totalOutstandingFormatted: financial.outstanding.totalOutstandingFormatted,
      occupancyRatePercent: operational.occupancy.occupancyRatePercent,
      occupiedNights: operational.occupancy.occupiedNights,
      totalBookings: operational.guestMetrics.totalBookings,
      totalGuests: operational.guestMetrics.totalGuests,
      averageStayLength: operational.occupancy.averageLengthOfStay,
    },
    operational,
    financial,
  };
}

/**
 * Generates CSV string for export.
 */
async function generateReportCsv(reportType = "summary", filters = {}, db = prisma) {
  const esc = (val) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const lines = [];

  if (reportType === "operational") {
    const report = await getOperationalReport(filters, db);
    lines.push(esc("RIVER FRONT HEAVEN - OPERATIONAL & OCCUPANCY REPORT"));
    lines.push(esc(`Period: ${report.period.from} to ${report.period.to} (${report.period.totalDays} days)`));
    lines.push("");

    lines.push(esc("OPERATIONAL KPIS"));
    lines.push(["Metric", "Value"].map(esc).join(","));
    lines.push(["Available Cabana Nights", report.occupancy.availableCabanaNights].map(esc).join(","));
    lines.push(["Occupied Nights", report.occupancy.occupiedNights].map(esc).join(","));
    lines.push(["Occupancy Rate (%)", `${report.occupancy.occupancyRatePercent}%`].map(esc).join(","));
    lines.push(["Average Length of Stay (Nights)", report.occupancy.averageLengthOfStay].map(esc).join(","));
    lines.push(["Total Bookings", report.guestMetrics.totalBookings].map(esc).join(","));
    lines.push(["Total Guests", report.guestMetrics.totalGuests].map(esc).join(","));
    lines.push(["Adults", report.guestMetrics.totalAdults].map(esc).join(","));
    lines.push(["Children", report.guestMetrics.totalChildren].map(esc).join(","));
    lines.push(["Cancellation Rate (%)", `${report.statusBreakdown.cancellationRatePercent}%`].map(esc).join(","));
    lines.push("");

    lines.push(esc("STAY PACKAGES BREAKDOWN"));
    lines.push(["Package", "Stays Count", "Nights Count", "Share (%)"].map(esc).join(","));
    for (const pkg of report.packageBreakdown) {
      lines.push([pkg.packageName, pkg.staysCount, pkg.nightsCount, `${pkg.sharePercent}%`].map(esc).join(","));
    }
    lines.push("");

    lines.push(esc("ITEMIZED RESERVATIONS"));
    lines.push([
      "Reference",
      "Guest Name",
      "Phone",
      "Package",
      "Check-in",
      "Check-out",
      "Nights",
      "Adults",
      "Children",
      "Source",
      "Status",
    ].map(esc).join(","));

    for (const r of report.reservations) {
      lines.push([
        r.reference,
        r.guestName,
        r.phone,
        r.package,
        r.checkInDate,
        r.checkOutDate,
        r.totalNights,
        r.adults,
        r.children,
        r.source,
        r.status,
      ].map(esc).join(","));
    }
  } else if (reportType === "financial") {
    const report = await getFinancialReport(filters, db);
    lines.push(esc("RIVER FRONT HEAVEN - FINANCIAL REPORT"));
    lines.push(esc(`Period: ${report.period.from} to ${report.period.to}`));
    lines.push("");

    lines.push(esc("REVENUE BREAKDOWN"));
    lines.push(["Department / Category", "Amount (LKR)"].map(esc).join(","));
    lines.push(["Accommodation Revenue", report.revenue.breakdown.accommodation].map(esc).join(","));
    lines.push(["Activities & Safari Revenue", report.revenue.breakdown.activities].map(esc).join(","));
    lines.push(["Food & Beverage Revenue", report.revenue.breakdown.foodBeverage].map(esc).join(","));
    lines.push(["Bar Revenue", report.revenue.breakdown.bar].map(esc).join(","));
    lines.push(["Bill Adjustments / Discounts", report.revenue.breakdown.adjustments].map(esc).join(","));
    lines.push(["Gross Revenue", report.revenue.grossRevenue].map(esc).join(","));
    lines.push(["Taxes & Levies", report.revenue.totalTax].map(esc).join(","));
    lines.push(["Net Revenue", report.revenue.netRevenue].map(esc).join(","));
    lines.push("");

    lines.push(esc("COLLECTIONS BY METHOD"));
    lines.push(["Payment Method", "Count", "Total (LKR)"].map(esc).join(","));
    lines.push(["Cash", report.collections.byMethod.CASH.count, report.collections.byMethod.CASH.total].map(esc).join(","));
    lines.push(["Credit / Debit Card", report.collections.byMethod.CARD.count, report.collections.byMethod.CARD.total].map(esc).join(","));
    lines.push(["Bank Transfer", report.collections.byMethod.BANK_TRANSFER.count, report.collections.byMethod.BANK_TRANSFER.total].map(esc).join(","));
    lines.push(["Total Collections", "", report.collections.totalCollections].map(esc).join(","));
    lines.push("");

    lines.push(esc("FINANCIAL LEDGER"));
    lines.push([
      "Reference",
      "Guest Name",
      "Check-in",
      "Check-out",
      "Accommodation",
      "Activities",
      "F&B",
      "Bar",
      "Adjustments",
      "Total Charges",
      "Paid Amount",
      "Balance",
      "Invoice #",
      "Status",
    ].map(esc).join(","));

    for (const item of report.ledger) {
      lines.push([
        item.reference,
        item.guestName,
        item.checkInDate,
        item.checkOutDate,
        item.accommodation,
        item.activities,
        item.foodBeverage,
        item.bar,
        item.adjustments,
        item.total,
        item.paid,
        item.balance,
        item.invoiceNumber || "N/A",
        item.status,
      ].map(esc).join(","));
    }
  } else {
    // Executive Summary CSV
    const report = await getReportSummary(filters, db);
    lines.push(esc("RIVER FRONT HEAVEN - EXECUTIVE MANAGEMENT SUMMARY"));
    lines.push(esc(`Period: ${report.period.from} to ${report.period.to}`));
    lines.push("");

    lines.push(esc("EXECUTIVE KPIS"));
    lines.push(["Metric", "Value"].map(esc).join(","));
    lines.push(["Gross Revenue (LKR)", report.kpis.grossRevenue].map(esc).join(","));
    lines.push(["Total Collections (LKR)", report.kpis.totalCollections].map(esc).join(","));
    lines.push(["Total Outstanding Balances (LKR)", report.kpis.totalOutstanding].map(esc).join(","));
    lines.push(["Occupancy Rate (%)", `${report.kpis.occupancyRatePercent}%`].map(esc).join(","));
    lines.push(["Occupied Nights", report.kpis.occupiedNights].map(esc).join(","));
    lines.push(["Total Bookings", report.kpis.totalBookings].map(esc).join(","));
    lines.push(["Total Guests", report.kpis.totalGuests].map(esc).join(","));
    lines.push(["Average Stay (Nights)", report.kpis.averageStayLength].map(esc).join(","));
    lines.push("");

    lines.push(esc("DEPARTMENT REVENUE"));
    lines.push(["Department", "Amount (LKR)"].map(esc).join(","));
    lines.push(["Accommodation", report.financial.revenue.breakdown.accommodation].map(esc).join(","));
    lines.push(["Activities & Safari", report.financial.revenue.breakdown.activities].map(esc).join(","));
    lines.push(["Food & Beverage", report.financial.revenue.breakdown.foodBeverage].map(esc).join(","));
    lines.push(["Bar", report.financial.revenue.breakdown.bar].map(esc).join(","));
    lines.push(["Adjustments", report.financial.revenue.breakdown.adjustments].map(esc).join(","));
  }

  return lines.join("\r\n");
}

/**
 * Generates PDF management report using PDFKit.
 */
async function generateReportPdf(reportType = "summary", filters = {}, db = prisma) {
  const summary = await getReportSummary(filters, db);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
        size: "A4",
        bufferPages: true,
        info: {
          Title: `River Front Heaven - ${reportType.toUpperCase()} Report`,
          Author: "River Front Heaven Resort Management",
        },
      });

      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      const pageWidth = doc.page.width;
      const margin = 40;
      const contentWidth = pageWidth - margin * 2;

      // Color Palette
      const brandDark = "#083a44";
      const brandColor = "#0b4f5c";
      const brandSoft = "#dceef0";
      const textDark = "#12302f";
      const textMuted = "#3e5a58";
      const borderLine = "#d5e2e0";

      // 1. Top Decorative Brand Bar
      doc.rect(margin, margin, contentWidth, 6).fill(brandColor);

      // 2. Header
      doc.y = margin + 16;
      doc
        .fillColor(brandDark)
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("RIVER FRONT HEAVEN", margin, doc.y);

      doc
        .fillColor(textMuted)
        .fontSize(8.5)
        .font("Helvetica")
        .text("Boutique Riverside Eco-Cabana & Safari Resort · Sri Lanka", margin, doc.y + 2);

      // Title & Date on Right
      const rightX = pageWidth - margin - 220;
      doc
        .fillColor(brandColor)
        .fontSize(14)
        .font("Helvetica-Bold")
        .text(
          reportType === "operational"
            ? "OPERATIONAL REPORT"
            : reportType === "financial"
            ? "FINANCIAL REPORT"
            : "MANAGEMENT SUMMARY",
          rightX,
          margin + 16,
          { width: 220, align: "right" }
        );

      doc
        .fillColor(textMuted)
        .fontSize(8.5)
        .font("Helvetica")
        .text(
          `Period: ${summary.period.from} to ${summary.period.to}`,
          rightX,
          doc.y + 2,
          { width: 220, align: "right" }
        );

      doc.text(
        `Generated: ${new Date().toLocaleString("en-GB")}`,
        rightX,
        doc.y + 2,
        { width: 220, align: "right" }
      );

      doc.y = margin + 65;

      // Divider
      doc.strokeColor(borderLine).lineWidth(1).moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
      doc.y += 12;

      // 3. Executive KPI Cards (Grid of 4 cards)
      const cardWidth = (contentWidth - 18) / 4;
      const cardHeight = 52;
      const cardY = doc.y;

      const kpis = [
        { label: "GROSS REVENUE", val: summary.kpis.grossRevenueFormatted },
        { label: "COLLECTIONS", val: summary.kpis.totalCollectionsFormatted },
        { label: "OCCUPANCY RATE", val: `${summary.kpis.occupancyRatePercent}%` },
        { label: "TOTAL GUESTS", val: `${summary.kpis.totalGuests} Guests` },
      ];

      kpis.forEach((kpi, idx) => {
        const x = margin + idx * (cardWidth + 6);
        doc.roundedRect(x, cardY, cardWidth, cardHeight, 6).fill(brandSoft);
        doc
          .fillColor(brandDark)
          .fontSize(7.5)
          .font("Helvetica-Bold")
          .text(kpi.label, x + 8, cardY + 8);
        doc
          .fillColor(brandDark)
          .fontSize(11)
          .font("Helvetica-Bold")
          .text(kpi.val, x + 8, cardY + 24, { width: cardWidth - 16 });
      });

      doc.y = cardY + cardHeight + 16;

      // 4. Revenue Breakdown Table
      doc.fillColor(brandDark).fontSize(12).font("Helvetica-Bold").text("Departmental Financial Performance", margin, doc.y);
      doc.y += 6;

      // Draw table header
      let curY = doc.y;
      doc.rect(margin, curY, contentWidth, 18).fill("#e8f1f0");
      let colX = margin + 8;
      doc.fillColor(brandDark).fontSize(8).font("Helvetica-Bold");
      doc.text("Department", colX, curY + 5);
      doc.text("Description", colX + 140, curY + 5);
      doc.text("Gross Amount (LKR)", colX + 350, curY + 5, { width: 100, align: "right" });
      curY += 18;

      const revenueRows = [
        ["Accommodation", "Cabana stay nights revenue", summary.financial.revenue.breakdown.accommodationFormatted],
        ["Safaris & Activities", "Wildlife tours and excursions", summary.financial.revenue.breakdown.activitiesFormatted],
        ["Food & Beverage", "Dining and kitchen orders", summary.financial.revenue.breakdown.foodBeverageFormatted],
        ["Bar & Beverages", "Refreshments & beverage sales", summary.financial.revenue.breakdown.barFormatted],
        ["Adjustments & Surcharges", "Folio adjustments & discounts", summary.financial.revenue.breakdown.adjustmentsFormatted],
      ];

      doc.font("Helvetica").fontSize(8.5);
      revenueRows.forEach((row, i) => {
        const rowBg = i % 2 === 0 ? "#ffffff" : "#f9fcfb";
        doc.rect(margin, curY, contentWidth, 16).fill(rowBg);
        doc.fillColor(textDark);
        doc.text(row[0], margin + 8, curY + 4);
        doc.fillColor(textMuted);
        doc.text(row[1], margin + 148, curY + 4);
        doc.fillColor(brandDark).font("Helvetica-Bold");
        doc.text(row[2], margin + 358, curY + 4, { width: 140, align: "right" });
        doc.font("Helvetica");
        curY += 16;
      });

      // Total Row
      doc.rect(margin, curY, contentWidth, 18).fill(brandSoft);
      doc.fillColor(brandDark).font("Helvetica-Bold").fontSize(9);
      doc.text("Gross Operating Revenue", margin + 8, curY + 4);
      doc.text(summary.financial.revenue.grossRevenueFormatted, margin + 358, curY + 4, { width: 140, align: "right" });
      curY += 24;

      // 5. Operational Summary Table
      doc.y = curY;
      doc.fillColor(brandDark).fontSize(12).font("Helvetica-Bold").text("Operational & Occupancy Summary", margin, doc.y);
      doc.y += 6;

      curY = doc.y;
      doc.rect(margin, curY, contentWidth, 18).fill("#e8f1f0");
      doc.fillColor(brandDark).fontSize(8).font("Helvetica-Bold");
      doc.text("Operational Metric", margin + 8, curY + 5);
      doc.text("Period Value", margin + 358, curY + 5, { width: 140, align: "right" });
      curY += 18;

      const opRows = [
        ["Total Available Cabana Nights", `${summary.operational.occupancy.availableCabanaNights} Nights`],
        ["Total Occupied Nights", `${summary.operational.occupancy.occupiedNights} Nights`],
        ["Occupancy Rate", `${summary.operational.occupancy.occupancyRatePercent}%`],
        ["Average Length of Stay", `${summary.operational.occupancy.averageLengthOfStay} Nights`],
        ["Total Guest Reservations", `${summary.operational.guestMetrics.totalBookings} Bookings`],
        ["Total Guests Hosted", `${summary.operational.guestMetrics.totalGuests} (${summary.operational.guestMetrics.totalAdults} Adults, ${summary.operational.guestMetrics.totalChildren} Children)`],
        ["Booking Source: Phone / Walk-in", `${summary.operational.sourceBreakdown.phone} Phone (${summary.operational.sourceBreakdown.phonePercent}%) / ${summary.operational.sourceBreakdown.walkIn} Walk-in (${summary.operational.sourceBreakdown.walkInPercent}%)`],
      ];

      doc.font("Helvetica").fontSize(8.5);
      opRows.forEach((row, i) => {
        const rowBg = i % 2 === 0 ? "#ffffff" : "#f9fcfb";
        doc.rect(margin, curY, contentWidth, 16).fill(rowBg);
        doc.fillColor(textDark);
        doc.text(row[0], margin + 8, curY + 4);
        doc.fillColor(brandDark).font("Helvetica-Bold");
        doc.text(row[1], margin + 358, curY + 4, { width: 140, align: "right" });
        doc.font("Helvetica");
        curY += 16;
      });

      // 6. Footer on all pages
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.strokeColor(borderLine).lineWidth(0.5).moveTo(margin, doc.page.height - 35).lineTo(pageWidth - margin, doc.page.height - 35).stroke();
        doc
          .fillColor(textMuted)
          .fontSize(7.5)
          .font("Helvetica")
          .text(
            "River Front Heaven · Executive Management Report · Confidential",
            margin,
            doc.page.height - 28
          );
        doc.text(
          `Page ${i + 1} of ${pages.count}`,
          pageWidth - margin - 100,
          doc.page.height - 28,
          { width: 100, align: "right" }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  calculateNights,
  calculateNightsInWindow,
  formatCurrency,
  resolveDateRange,
  getDashboardStats,
  getOperationalReport,
  getFinancialReport,
  getReportSummary,
  generateReportCsv,
  generateReportPdf,
};
