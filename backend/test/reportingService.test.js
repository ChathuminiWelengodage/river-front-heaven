const test = require("node:test");
const assert = require("node:assert");
const app = require("../src/app");
const reportingService = require("../src/services/reportingService");

test("Reporting: Unauthenticated dashboard and report requests are rejected with 401", async () => {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  try {
    const res1 = await fetch(`${baseUrl}/dashboard/stats`);
    assert.strictEqual(res1.status, 401);

    const res2 = await fetch(`${baseUrl}/dashboard/summary`);
    assert.strictEqual(res2.status, 401);

    const res3 = await fetch(`${baseUrl}/reports/summary`);
    assert.strictEqual(res3.status, 401);

    const res4 = await fetch(`${baseUrl}/reports/operational`);
    assert.strictEqual(res4.status, 401);

    const res5 = await fetch(`${baseUrl}/reports/financial`);
    assert.strictEqual(res5.status, 401);

    const res6 = await fetch(`${baseUrl}/reports/export/csv?type=summary`);
    assert.strictEqual(res6.status, 401);

    const res7 = await fetch(`${baseUrl}/reports/export/pdf?type=summary`);
    assert.strictEqual(res7.status, 401);
  } finally {
    server.close();
  }
});

test("Reporting: Date range and stay night calculations", () => {
  const nights = reportingService.calculateNights("2026-11-10", "2026-11-15");
  assert.strictEqual(nights, 5);

  const windowNights = reportingService.calculateNightsInWindow(
    "2026-11-01",
    "2026-11-10",
    "2026-11-05",
    "2026-11-15"
  );
  assert.strictEqual(windowNights, 5);

  const customRange = reportingService.resolveDateRange(null, "2026-11-01", "2026-11-10");
  assert.strictEqual(customRange.from, "2026-11-01");
  assert.strictEqual(customRange.to, "2026-11-10");

  const todayRange = reportingService.resolveDateRange("today");
  assert.ok(todayRange.from);
  assert.ok(todayRange.to);
});

test("Reporting: Mock-based Dashboard and Reports generation", async () => {
  const mockDb = {
    cabanas: [{ id: 1, name: "The River Cabana", status: "AVAILABLE" }],
    reservations: [
      {
        id: 1,
        reference: "RFH-2026-101",
        status: "CHECKED_IN",
        source: "PHONE",
        packageId: 1,
        adults: 2,
        children: 1,
        checkInDate: new Date("2026-11-15T14:00:00Z"),
        checkOutDate: new Date("2026-11-20T11:00:00Z"),
        nightlyRate: 15000,
        guest: { fullName: "Amara Silva", phone: "0771234567", idNumber: "NIC901" },
        package: { name: "Couple Escape" },
        activityBookings: [
          {
            id: 1,
            totalCharge: 5000,
            status: "BOOKED",
            scheduledAt: new Date("2026-11-17T09:00:00Z"),
            participants: 2,
            activity: { name: "River Safari" },
          },
        ],
        fnbOrders: [
          {
            id: 1,
            totalCost: 3500,
            status: "PLACED",
            createdAt: new Date("2026-11-17T12:00:00Z"),
            items: [{ quantity: 2 }],
          },
        ],
        barOrders: [
          {
            id: 1,
            totalCost: 1800,
            createdAt: new Date("2026-11-17T18:00:00Z"),
            barItem: { name: "Cocktail" },
          },
        ],
        adjustments: [],
        payments: [
          {
            id: 1,
            amount: 10000,
            method: "CASH",
            paidAt: new Date("2026-11-15T15:00:00Z"),
            isAdvance: true,
          },
        ],
        invoice: null,
      },
    ],
    payments: [
      {
        id: 1,
        amount: 10000,
        method: "CASH",
        paidAt: new Date("2026-11-17T10:00:00Z"),
        isAdvance: true,
        reservation: {
          reference: "RFH-2026-101",
          guest: { fullName: "Amara Silva" },
        },
      },
    ],
    activityBookings: [
      {
        id: 1,
        totalCharge: 5000,
        status: "BOOKED",
        scheduledAt: new Date("2026-11-17T09:00:00Z"),
        participants: 2,
        activity: { name: "River Safari" },
        reservation: { guest: { fullName: "Amara Silva" } },
      },
    ],
    fnbOrders: [
      {
        id: 1,
        totalCost: 3500,
        status: "PLACED",
        createdAt: new Date("2026-11-17T12:00:00Z"),
        items: [{ quantity: 2 }],
        reservation: { reference: "RFH-2026-101", guest: { fullName: "Amara Silva" } },
      },
    ],
    invoices: [],
  };

  // 1. Dashboard Stats
  const dashboard = await reportingService.getDashboardStats({ date: "2026-11-17" }, mockDb);
  assert.ok(dashboard.cabana);
  assert.strictEqual(dashboard.cabana.status, "OCCUPIED");
  assert.strictEqual(dashboard.operations.inHouseStaysCount, 1);
  assert.strictEqual(dashboard.financials.revenueToday, 10000);

  // 2. Operational Report
  const opReport = await reportingService.getOperationalReport(
    { from: "2026-11-01", to: "2026-11-30" },
    mockDb
  );
  assert.strictEqual(opReport.guestMetrics.totalBookings, 1);
  assert.strictEqual(opReport.guestMetrics.totalGuests, 3);
  assert.ok(opReport.occupancy.occupancyRatePercent > 0);

  // 3. Financial Report
  const finReport = await reportingService.getFinancialReport(
    { from: "2026-11-01", to: "2026-11-30" },
    mockDb
  );
  assert.ok(finReport.revenue.grossRevenue > 0);
  assert.strictEqual(finReport.collections.totalCollections, 10000);

  // 4. Summary Report
  const summary = await reportingService.getReportSummary(
    { from: "2026-11-01", to: "2026-11-30" },
    mockDb
  );
  assert.ok(summary.kpis.grossRevenue > 0);

  // 5. CSV Generation
  const csvSummary = await reportingService.generateReportCsv("summary", { from: "2026-11-01", to: "2026-11-30" }, mockDb);
  assert.ok(csvSummary.includes("RIVER FRONT HEAVEN"));

  const csvOp = await reportingService.generateReportCsv("operational", { from: "2026-11-01", to: "2026-11-30" }, mockDb);
  assert.ok(csvOp.includes("Amara Silva"));

  const csvFin = await reportingService.generateReportCsv("financial", { from: "2026-11-01", to: "2026-11-30" }, mockDb);
  assert.ok(csvFin.includes("RFH-2026-101"));

  // 6. PDF Generation
  const pdfBuffer = await reportingService.generateReportPdf("summary", { from: "2026-11-01", to: "2026-11-30" }, mockDb);
  assert.ok(Buffer.isBuffer(pdfBuffer));
  assert.ok(pdfBuffer.toString("utf8", 0, 4).startsWith("%PDF"));
});
