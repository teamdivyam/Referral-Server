import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import AdminModel from "../db/models/admin.js";
import logger from "../logging/index.js";
import {
    ACCESS_TOKEN_SECRET,
    ErrorCodes,
    ErrorStatusCode,
} from "../utils/constant.js";

const adminAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];

        if (!token)
            return next(
                createHttpError(ErrorStatusCode.AUTH_REQUIRED, {
                    code: ErrorCodes.AUTH_REQUIRED,
                    message: "Authentication Required",
                })
            );

        // Verify Token
        const secretObject = jwt.verify(token, ACCESS_TOKEN_SECRET);

        const admin = await AdminModel.findById(secretObject._id);

        if (admin) {
            return next();
        }

        next(
            createHttpError(ErrorStatusCode.AUTH_REQUIRED, {
                code: ErrorCodes.AUTH_REQUIRED,
                message: "Authentication Required",
            })
        );
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
