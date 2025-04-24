// Middleware to check authentication and handle token refresh
import logger from "../../config/logger.js";
import passport from "../../config/passport.js";

const authenticate = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: info.message || "Authentication failed",
      });
    }

    req.user = user;

    // If a new token was generated, send it in the response
    if (req.newAccessToken) {
      logger.info("Adding new access token to response cookie");
      // res.setHeader("Authorization", `Bearer ${req.newAccessToken}`);
      res.cookie("accessToken", req.newAccessToken, {
        httpOnly: true,
        sameSite: "none",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 1000, // 1 hour
      });
    }

    next();
  })(req, res, next);
};

export default authenticate;
