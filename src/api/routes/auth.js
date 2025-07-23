import express from "express";
import AdminAuthController from "../controllers/adminAuth.js";
import { detectDevice } from "../middlewares/detectDevice.js";

const AuthRouter = express.Router();

AuthRouter.post("/admin/login", detectDevice, AdminAuthController.login);
AuthRouter.post("/admin/register", AdminAuthController.register);

export default AuthRouter;