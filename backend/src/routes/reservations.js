const crypto = require("node:crypto");
const express = require("express");
const { z } = require("zod");
const prisma = require("../db");
const HttpError = require("../utils/httpError");
const asyncHandler = require("../utils/asyncHandler");
const parseId = require("../utils/parseId");
const validate = require("../middleware/validate");
const { authenticate: staff } = require("../middleware/auth"); // any logged-in staff member

const router = express.Router();

const ACTIVE = ["PENDING", "CONFIRMED", "CHECKED_IN"]; // these statuses occupy the cabana
const show = { include: { guest: true, package: true }, omit: { portalPasswordHash: true } }; // never send the password hash

const date = z.string().date(); // "2026-11-10"
const bookingFields = {
    packageId: z.number().int().positive(),
    checkInDate: date,
    checkOutDate: date,
    adults: z.number().int().min(1),
    children: z.number().int().min(0).default(0),
    source: z.enum(["PHONE", "WALK_IN"]),
    notes: z.string().max(500).optional(),
};
const createSchema = z.object({ guestId: z.number().int().positive(), ...bookingFields });
const editSchema = z.object(bookingFields);

// THE overlap rule: a stay covers the nights from check-in up to (not including) check-out.
// Two stays clash when each starts before the other ends, so a guest may arrive the day another leaves.
const findClash = (from, to, excludeId) =>
    prisma.reservation.findFirst({
        where: { status: { in: ACTIVE }, checkInDate: { lt: to }, checkOutDate: { gt: from }, id: { not: excludeId } },
    });

// The checks for a new or edited booking
async function check(b, excludeId) {
    const pkg = await prisma.stayPackage.findUnique({ where: { id: b.packageId } });
    const cabana = await prisma.cabana.findFirst();
    if (!pkg?.isActive) throw new HttpError(400, "Choose an active package", "INVALID_PACKAGE");
    if (b.adults > pkg.maxAdults || b.children > pkg.maxChildren || b.adults + b.children > cabana.maxGuests) {
        throw new HttpError(400, `Too many guests for the ${pkg.name} package`, "GUEST_LIMIT_EXCEEDED");
    }
    if (b.checkOutDate <= b.checkInDate) throw new HttpError(400, "checkOutDate must be after checkInDate", "INVALID_DATES");

    const from = new Date(b.checkInDate);
    const to = new Date(b.checkOutDate);
    if (await findClash(from, to, excludeId)) {
        throw new HttpError(409, "The cabana is not available for these dates", "DATES_UNAVAILABLE");
    }
    return { pkg, cabana, from, to };
}

async function find(id) {
    const r = await prisma.reservation.findUnique({ where: { id }, ...show });
    if (!r) throw new HttpError(404, "Reservation not found", "NOT_FOUND");
    return r;
}

module.exports = router;