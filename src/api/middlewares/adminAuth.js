import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import AdminModel from "../../db/models/admin.js";
import logger from "../../logging/index.js";
import {
    ACCESS_TOKEN_SECRET,
    ErrorCodes,
    ErrorStatusCode,
    HTTPStatus,
} from "../../utils/constant.js";
import SessionModel from "../../db/models/Session.js";

const adminAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];

        if (!token)
            return next(
                createHttpError(HTTPStatus.UNAUTHORIZED, {
                    code: "AUTHENTICATION_REQUIRED",
                    message: "Authentication Required",
                })
            );

        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
        const isExpired = Date.now() >= decoded.exp * 1000;

        // const admin = await AdminModel.findById(decoded._id);
        // req.admin = admin;

        const session = await SessionModel.findOne({
            token,
            isActive: true,
        });

        if (!session) {
            return next(
                createHttpError(HTTPStatus.UNAUTHORIZED, {
                    code: "INVALID_SESSION",
                    message: "Invalid Session",
                })
            );
        }

        // Update session if token expired
        if (isExpired && session.isActive) {
            session.isActive = false;
            session.expiresAt = new Date();
            await session.save();

            return next(
                createHttpError(HTTPStatus.UNAUTHORIZED, {
                    code: "INVALID_SESSION",
                    message: "Invalid Session",
                })
            );
        }

        req.sessionInfo = {
            id: session._id,
            adminId: session.admin
        }
        session.lastActivity = Date.now();
        await session.save();

        next();
    } catch (error) {
        logger.error(error.message);

        return next(
            createHttpError(ErrorStatusCode.AUTH_INVALID_CREDENTIALS, {
                code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
                message: "Invalid Credentials",
            })
        );
    }
};

export default adminAuth;
