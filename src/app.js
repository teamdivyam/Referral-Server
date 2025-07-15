import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import { configDotenv } from "dotenv";

// import AgentRouter from "./api/routes/agent.js";
// import passport, { refreshTokenMiddleware } from "./config/passport.js";
// import ReferralRouter from "./api/routes/referral.js";
// import { requireAuth } from "./config/passport.js";
import AuthRouter from "./api/routes/auth.js";
import globalErrorHandler from "./api/middlewares/ErrorHandler.js";
import AdminRouter from "./api/routes/admin.js";
import logger from "./logging/index.js";
import adminAuth from "./api/middlewares/adminAuth.js";
import ReferralRouterV1 from "./api/routes/referralV1.js";
import {
    authenticateUser,
    registerUser,
} from "./api/controllers/officeUserAuth.controller.js";
import { officeUserAuthMiddleware } from "./api/middlewares/officeUserAuth.js";
import CounterModel from "./db/models/ReferralCounter.js";
import { apiRateLimiter } from "./api/middlewares/rateLimiter.js";

configDotenv();
const app = express();

const allowedOrigins = [
    process.env.ORIGIN1,
    process.env.ORIGIN2,
    "http://localhost:3000",
    "http://localhost:5173",
    "https://divyam-com.vercel.app/",
];

const corsOptions = {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "OPTIONS", "DELETE"],
    allowedHeaders: [
        "Authorization",
        "Content-Type",
        "Accept-Language",
        "Cookie",
    ],
};


// Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(compression());
// app.use(passport.initialize());
app.use((req, res, next) => {
    logger.info(`Incoming request: ${req.method} ${req.url}`);
    next();
});
// app.use(officeUserAuthMiddleware);
// app.set("trust proxy", true);

// Initialize counter
// (async () => {
//     await CounterModel.findByIdAndUpdate(
//         "referralEventId",
//         { $set: { seq: 1000 } },
//         { upsert: true }
//     );
// })();

// Routers
app.use("/api/referral/auth", apiRateLimiter, AuthRouter);
app.use("/api/referral/admin", adminAuth, AdminRouter);
app.use("/api/referral", ReferralRouterV1);

// app.post('/auth/signup', registerUser);
// app.post('/auth/login', authenticateUser);

// Unkown routes error handler
app.use("*", (req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
        path: req.originalUrl,
        method: req.method,
    });
});

// Error Handler
app.use(globalErrorHandler);

export default app;
