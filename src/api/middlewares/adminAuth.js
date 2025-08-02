import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import SessionModel from "../../db/models/SessionModel.js";
import logger from "../../logging/index.js";
import {
    ACCESS_TOKEN_SECRET,
    HTTPStatus,
} from "../../utils/constant.js";

const adminAuth = async (req, res, next) => {
    try {
        // Retreive token from header
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            return next(
                createHttpError(HTTPStatus.UNAUTHORIZED, {
                    message: "Missing authorization token",
                })
            );
        }
        const token = authHeader.split(" ")[1];

        // Check token is valid or expire
        let decoded;
        try {
            decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                await SessionModel.updateOne({ token }, { active: false });

                return next(
                    createHttpError(HTTPStatus.UNAUTHORIZED, {
                        message: "Token expired",
                    })
                );
            }
            return next(
                createHttpError(HTTPStatus.UNAUTHORIZED, {
                    message: "Invalid token",
                })
            );
        }

        const session = await SessionModel.findOne({
            token,
            adminId: decoded.adminId,
            isActive: true,
        });

        if (!session) {
            return next(
                createHttpError(HTTPStatus.UNAUTHORIZED, {
                    message: "Session expired",
                })
            );
        }

        // Update last activity (only 1 / 10 requests)
        if (Math.random() < 0.1) {
            session.lastActivity = new Date();
        }

        req.sessionInfo = {
            id: session._id,
            adminId: session.adminId,
        };
        session.lastActivity = Date.now();
        await session.save();

        next();
    } catch (error) {
        logger.error(error.message);

        return next(
            createHttpError(HTTPStatus.SERVER_ERROR, {
                code: "SERVER_ERROR",
                message: error.message,
            })
        );
    }
};

export default adminAuth;
