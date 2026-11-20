const express = require("express");
const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const { authenticate: staff } = require("../middleware/auth");
const reportingService = require("../services/reportingService");

const router = express.Router();

const reportFilterSchema = z.object({
  preset: z
    .enum([
      "today",
      "yesterday",
      "7d",
      "last7days",
      "30d",
      "last30days",
      "this_month",
      "last_month",
      "ytd",
      "all",
    ])
    .optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  status: z
    .enum(["ALL", "PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"])
    .optional(),
  source: z.enum(["ALL", "PHONE", "WALK_IN"]).optional(),
  paymentMethod: z.enum(["ALL", "CASH", "CARD", "BANK_TRANSFER"]).optional(),
  packageId: z.coerce.number().int().positive().optional(),
});

const exportQuerySchema = reportFilterSchema.extend({
  type: z.enum(["summary", "operational", "financial"]).default("summary"),
  download: z.enum(["true", "false"]).optional(),
});

// GET /api/reports/summary
router.get(
  "/summary",
  staff,
  validate(reportFilterSchema, "query"),
  asyncHandler(async (req, res) => {
    const summary = await reportingService.getReportSummary(req.query);
    res.json({
      success: true,
      data: summary,
    });
  })
);

// GET /api/reports/operational
router.get(
  "/operational",
  staff,
  validate(reportFilterSchema, "query"),
  asyncHandler(async (req, res) => {
    const operational = await reportingService.getOperationalReport(req.query);
    res.json({
      success: true,
      data: operational,
    });
  })
);

// GET /api/reports/financial
router.get(
  "/financial",
  staff,
  validate(reportFilterSchema, "query"),
  asyncHandler(async (req, res) => {
    const financial = await reportingService.getFinancialReport(req.query);
    res.json({
      success: true,
      data: financial,
    });
  })
);

// GET /api/reports/export/csv
router.get(
  "/export/csv",
  staff,
  validate(exportQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const type = req.query.type || "summary";
    const csvContent = await reportingService.generateReportCsv(type, req.query);
    const filename = `rfh-${type}-report-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csvContent);
  })
);

// GET /api/reports/export/pdf
router.get(
  "/export/pdf",
  staff,
  validate(exportQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const type = req.query.type || "summary";
    const pdfBuffer = await reportingService.generateReportPdf(type, req.query);
    const filename = `rfh-${type}-report-${new Date().toISOString().slice(0, 10)}.pdf`;

    const disposition = req.query.download === "true" ? "attachment" : "inline";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${disposition}; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  })
);

module.exports = router;
