const prisma = require("../db");
const HttpError = require("../utils/httpError");
const asyncHandler = require("../utils/asyncHandler");
const { verifyToken } = require("../services/tokens");

const authenticate = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization || (req.query.token ? `Bearer ${req.query.token}` : "");
    const [schema, token] = authHeader.split(" ");
    if (schema !== "Bearer" || !token) {
        throw new HttpError(401, "Please Login", "UNAUTHENTICATED");
    }
    let payload;
    try {
        payload = verifyToken(token);
    } catch {
        throw new HttpError(401, "Your session is invalid or has expired", "INVALID_TOKEN");
    }
    if (payload.type !== "staff") {
        throw new HttpError(401, "Your session is invalid", "INVALID_TOKEN");
    }
    const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) } });
    if (!user || !user.isActive) {
        throw new HttpError(401, "This account is not active", "ACCOUNT_INACTIVE");
    }

    req.user = user;
    next();
})

const requireRole =
    (...roles) =>
        (req, _res, next) =>
            roles.includes(req.user?.role)
                ? next()
                : next(new HttpError(403, "You do not have permission to do this", "FORBIDDEN"));

const requireAdmin = requireRole("ADMIN");

module.exports = { authenticate, requireRole, requireAdmin };