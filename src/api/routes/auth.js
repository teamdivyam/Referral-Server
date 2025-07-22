import express from "express";
import AdminAuthController from "../controllers/adminAuth.js";
import { detectDevice } from "../middlewares/detectDevice.js";
// import AuthController from "../controllers/agentAuth.js";

const AuthRouter = express.Router();

// AuthRouter.post("/login", AuthController.login);
// AuthRouter.post("/register", AuthController.register);
// AuthRouter.post("/logout", AuthController.logout);

// Admin Authentication
AuthRouter.post("/admin/login", detectDevice, AdminAuthController.login);
AuthRouter.post("/admin/register", AdminAuthController.register);

export default AuthRouter;