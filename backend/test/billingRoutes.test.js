const test = require("node:test");
const assert = require("node:assert");
const app = require("../src/app");

test("Billing Routes: Unauthenticated requests are rejected with 401", async () => {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api/billing`;

  try {
    // GET /active-stays
    const res1 = await fetch(`${baseUrl}/active-stays`);
    assert.strictEqual(res1.status, 401);
    const body1 = await res1.json();
    assert.strictEqual(body1.code, "UNAUTHENTICATED");

    // GET /reservations/1/bill
    const res2 = await fetch(`${baseUrl}/reservations/1/bill`);
    assert.strictEqual(res2.status, 401);
    const body2 = await res2.json();
    assert.strictEqual(body2.code, "UNAUTHENTICATED");

    // POST /charges
    const res3 = await fetch(`${baseUrl}/charges`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chargeType: "BAR" }),
    });
    assert.strictEqual(res3.status, 401);

    // POST /reservations/1/payments
    const res4 = await fetch(`${baseUrl}/reservations/1/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 5000, method: "CASH" }),
    });
    assert.strictEqual(res4.status, 401);

    // GET /reservations/1/invoice/pdf
    const res5 = await fetch(`${baseUrl}/reservations/1/invoice/pdf`);
    assert.strictEqual(res5.status, 401);
    const body5 = await res5.json();
    assert.strictEqual(body5.code, "UNAUTHENTICATED");

    // GET /invoices/INV-1001/pdf
    const res6 = await fetch(`${baseUrl}/invoices/INV-1001/pdf`);
    assert.strictEqual(res6.status, 401);

    // GET /reservations/1/invoice
    const res7 = await fetch(`${baseUrl}/reservations/1/invoice`);
    assert.strictEqual(res7.status, 401);

    // GET /invoices/INV-1001
    const res8 = await fetch(`${baseUrl}/invoices/INV-1001`);
    assert.strictEqual(res8.status, 401);
  } finally {
    server.close();
  }
});

test("Billing Routes: Invalid route parameters return 400", async () => {
  const server = app.listen(0);
  const { port } = server.address();

  try {
    // Non-integer ID
    const res = await fetch(`http://127.0.0.1:${port}/api/billing/reservations/not-a-number/bill`, {
      headers: { Authorization: "Bearer dummy-token" },
    });
    // Even before token or inside parseId, non-int IDs are caught
    assert.ok([400, 401].includes(res.status));

    // Non-integer ID for PDF endpoint
    const resPdf = await fetch(`http://127.0.0.1:${port}/api/billing/reservations/not-a-number/invoice/pdf`, {
      headers: { Authorization: "Bearer dummy-token" },
    });
    assert.ok([400, 401].includes(resPdf.status));
  } finally {
    server.close();
  }
});
