import rateLimit from "express-rate-limit";

export const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes'
    },
    standarHeaders: true,
    legacyHeaders: false,
})