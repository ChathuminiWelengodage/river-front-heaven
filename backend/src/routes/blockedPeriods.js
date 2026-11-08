
const express = require("express");
const { z } = require("zod");
const prisma = require("../db");
const HttpError = require("../utils/httpError");
const asyncHandler = require("../utils/asyncHandler");
const parseId = require("../utils/parseId");
const validate = require("../middleware/validate");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

const staff = authenticate;
const admin = [authenticate, requireAdmin];

const date = z.string().date();

const createSchema = z.object({
  startDate: date,
  endDate: date,
  reason: z.string().trim().min(1).max(250),
}).refine(
  (value) => value.endDate > value.startDate,
  {
    message: "End date must be after start date",
    path: ["endDate"],
  }
);

// GET all blocked periods
router.get(
  "/blocked-periods",
  staff,
  asyncHandler(async (req, res) => {
    const cabana = await prisma.cabana.findFirst();

    if (!cabana) {
      throw new HttpError(404, "Cabana is not set up yet", "NOT_FOUND");
    }

    const periods = await prisma.blockedPeriod.findMany({
      where: { cabanaId: cabana.id },
      orderBy: { startDate: "asc" },
    });

    res.json({ data: periods });
  })
);

// CREATE a blocked period
router.post(
  "/blocked-periods",
  admin,
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const cabana = await prisma.cabana.findFirst();

    if (!cabana) {
      throw new HttpError(404, "Cabana is not set up yet", "NOT_FOUND");
    }

    const startDate = new Date(req.body.startDate);
    const endDate = new Date(req.body.endDate);

    const existingBlock = await prisma.blockedPeriod.findFirst({
      where: {
        cabanaId: cabana.id,
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
    });

    if (existingBlock) {
      throw new HttpError(
        409,
        "These dates overlap an existing blocked period",
        "BLOCKED_DATES_OVERLAP"
      );
    }

    const activeReservation = await prisma.reservation.findFirst({
      where: {
        status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
        checkInDate: { lt: endDate },
        checkOutDate: { gt: startDate },
      },
    });

    if (activeReservation) {
      throw new HttpError(
        409,
        "These dates overlap an existing reservation",
        "RESERVATION_OVERLAP"
      );
    }

    const period = await prisma.blockedPeriod.create({
      data: {
        cabanaId: cabana.id,
        startDate,
        endDate,
        reason: req.body.reason,
        createdById: req.user.id,
      },
    });

    res.status(201).json(period);
  })
);

// DELETE a blocked period
router.delete(
  "/blocked-periods/:id",
  admin,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);

    const existing = await prisma.blockedPeriod.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new HttpError(404, "Blocked period not found", "NOT_FOUND");
    }

    await prisma.blockedPeriod.delete({
      where: { id },
    });

    res.json({ message: "Blocked period removed successfully" });
  })
);

module.exports = router;
