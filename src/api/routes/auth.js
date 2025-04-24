import express from "express";
import AuthController from "../controllers/auth.js";
const AuthRouter = express.Router();

AuthRouter.post("/login", AuthController.login);
AuthRouter.post("/register", AuthController.register);
AuthRouter.post("/logout", AuthController.logout);

export default AuthRouter;