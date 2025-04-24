import passport from "passport";
import { Strategy } from "passport-jwt";
import {
  ACCESS_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRES,
  REFRESH_TOKEN_SECRET,
  REFRESH_TOKEN_EXPIRES
} from "../utils/constant.js";
import AgentModel from "../db/models/agent.js";
import jwt from "jsonwebtoken";

const cookieExtractor = (req) => {
  let accessToken = null;
  if (req && req.cookies) {
    accessToken = req.cookies["accessToken"];
  }
  return accessToken;
};

const opts = {
  jwtFromRequest: cookieExtractor,
  secretOrKey: ACCESS_TOKEN_SECRET,
};

passport.use(
  new Strategy(opts, async (payload, done) => {
    try {
      // Find the user by ID from token payload
      const agent = await AgentModel.findById(payload._id);

      if (!agent) {
        return done(null, false);
      }

      return done(null, agent);
    } catch (error) {
      return done(error, false);
    }
  })
);

export default passport;

// Middleware to require authentication
export const requireAuth = passport.authenticate("jwt", { session: false });

// Function to generate tokens and set cookies
export const generateTokensAndSetCookies = (agent, res) => {
  // Create JWT payload
  const payload = {
    _id: agent._id,
    email: agent.email,
  };

  // Generate tokens
  const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES,
  });
  const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES,
  });

  // Production
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    maxAge: 60 * 60 * 1000, // 1 hour
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 day
  });


  return { accessToken, refreshToken };
};

// Middleware to refresh token
export const refreshTokenMiddleware = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token missing" });
    }

    // Verify refresh token
    const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

    // Find user
    const agent = await AgentModel.findById(payload._id);

    if (!agent) {
      return res.status(401).json({ message: "User not found" });
    }

    // Generate new tokens and set cookies
    generateTokensAndSetCookies(agent, res);

    return res.status(200).json({ message: "Token refreshed successfully" });
  } catch (error) {
    // Clear cookies on error
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    return res.status(401).json({ message: "Invalid refresh token" });
  }
};

