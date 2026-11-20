const express = require("express");
const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const { authenticate: staff } = require("../middleware/auth");
const reportingService = require("../services/reportingService");

const router = express.Router();

const dashboardQuerySchema = z.object({
  date: z.string().date().optional(),
});

// GET /api/dashboard/stats
router.get(
  "/stats",
  staff,
  validate(dashboardQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const stats = await reportingService.getDashboardStats({
      date: req.query.date,
    });
    res.json({
      success: true,
      data: stats,
    });
  })
);

// GET /api/dashboard/summary
router.get(
  "/summary",
  staff,
  validate(dashboardQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const stats = await reportingService.getDashboardStats({
      date: req.query.date,
    });
    res.json({
      success: true,
      date: stats.date,
      cabana: stats.cabana,
      operations: stats.operations,
      financials: stats.financials,
    });
  })
);

module.exports = router;
