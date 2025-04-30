import createHttpError from "http-errors";

import {
  loginValidationSchema,
  registerValidationSchema,
} from "../validators/auth.js";
import {
  ErrorCodes,
  ErrorStatusCode,
  SuccessStatusCode,
} from "../../utils/constant.js";
import logger from "../../logging/index.js";
import { hashPasswordFn, comparePassword } from "../../utils/password.js";
import AgentModel from "../../db/models/agent.js";
import { generateTokensAndSetCookies } from "../../config/passport.js";

class AuthController {
  async login(req, res, next) {
    const { email, password } = req.body;

    // Validate email and password
    const { error } = loginValidationSchema.validate({
      email,
      password,
    });
    if (error) {
      logger.error("Error in login validation");
      return next(
        createHttpError(ErrorStatusCode.VALIDATION_INVALID_FORMAT, {
          code: ErrorCodes.VALIDATION_INVALID_FORMAT,
          message: error.details[0].message,
        })
      );
    }

    /**
     * Check if agent exists or not in the database
     * then proceed with the login logic
     */
    try {
      const agent = await AgentModel.findOne({ email });

      // Send error if agent doesn't exist with this email
      if (!agent) {
        return next(
          createHttpError(ErrorStatusCode.AUTH_INVALID_CREDENTIALS, {
            code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
            message: "Invalid credentials",
          })
        );
      }

      // Check if password is correct or not
      const isPasswordMatched = await comparePassword(
        password,
        agent.passwordHash
      );
      if (!isPasswordMatched) {
        return next(
          createHttpError(ErrorStatusCode.AUTH_INVALID_CREDENTIALS, {
            code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
            message: "Invalid credentials",
          })
        );
      }

      generateTokensAndSetCookies(agent, res);

      res.status(SuccessStatusCode.AUTH_LOGGED_IN).json({
        success: true,
        message: "You have logged in successfully",
      });
    } catch (error) {
      return next(
        createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
          code: ErrorCodes.SERVER_DATABASE_ERROR,
          message: "Internal Server Error",
        })
      );
    }
  }
  async register(req, res, next) {
    const { email, password, confirmPassword } = req.body;

    // Validate name, email, phoneNumber, password and confirmPassword
    const { error } = registerValidationSchema.validate({
      email,
      password,
      confirmPassword,
    });
    if (error) {
      logger.error("Error in register validation");
      return next(
        createHttpError(ErrorStatusCode.VALIDATION_INVALID_FORMAT, {
          code: ErrorCodes.VALIDATION_INVALID_FORMAT,
          message: error.details[0].message,
        })
      );
    }

    // Check if agent already exists with this email
    try {
      const agent = await AgentModel.findOne({ email });
      if (agent) {
        return next(
          createHttpError(ErrorStatusCode.RESOURCE_ALREADY_EXISTS, {
            code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
            message: "User already exists with this email",
          })
        );
      }

      // Hash password
      const passwordHash = await hashPasswordFn(password);

      // Create new agent
      const newAgent = await AgentModel.insertOne({
        email,
        passwordHash,
      });

      generateTokensAndSetCookies(newAgent, res);

      res.status(SuccessStatusCode.AUTH_REGISTERED).json({
        success: true,
        message: "You have registered successfully",
      });
    } catch (error) {
      return next(
        createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
          code: ErrorCodes.SERVER_DATABASE_ERROR,
          message: error.message,
        })
      );
    }
  }

  async logout(req, res, next) {
    try {
      // Clear access token cookie
      res.clearCookie("accessToken");

      // Clear refresh token cookie
      res.clearCookie("refreshToken");

      res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
}

export default new AuthController();
