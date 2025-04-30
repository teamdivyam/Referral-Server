import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";

import AgentRouter from "./api/routes/agent.js";
import AuthRouter from "./api/routes/auth.js";
import ReferralRouter from "./api/routes/referral.js";
import globalErrorHandler from "./api/middlewares/ErrorHandler.js";
import passport, { refreshTokenMiddleware } from "./config/passport.js";
import AdminRouter from "./api/routes/admin.js";
import { requireAuth } from "./config/passport.js";
import logger from "./logs/index.js";

const app = express();

const allowedOrigins = [
  process.env.ORIGIN1,
  process.env.ORIGIN2
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
app.use(passport.initialize());
app.use((req, res, next) => {
  logger.info(`Incoming request: ${req.method} ${req.url}`);
  next();
});


// Routers
app.use("/api/referral-system/auth", AuthRouter);
app.use("/api/referral-system/agent", requireAuth, AgentRouter);
app.use("/api/referral-system/referral", requireAuth, ReferralRouter);
app.use("/api/referral-system/admin", AdminRouter);
app.post("/api/referral-system/refresh-token", refreshTokenMiddleware);

// Error Handler
app.use(globalErrorHandler);

export default app;
