import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import logger from "../../logging/index.js";
import AdminModel from "../../db/models/admin.js";
import SessionModel from "../../db/models/Session.js";
import { comparePassword, hashPasswordFn } from "../../utils/password.js";
import { genAdminId } from "../../utils/genAdminId.js";
import {
    ACCESS_TOKEN_SECRET,
    ErrorCodes,
    ErrorStatusCode,
    HTTPStatus,
    SuccessStatusCode,
} from "../../utils/constant.js";
import { loginSchema, registerSchema } from "../validators/auth.js";

const AdminAuthController = {
    async login(req, res, next) {
        try {
            const { email, password } = req.body;

            // Validation
            const { error } = loginSchema.validate({
                email,
                password,
            });
            if (error) {
                return next(
                    createHttpError(HTTPStatus.BAD_REQUEST, {
                        code: "INVALID_FORMAT",
                        message: error.details[0].message,
                    })
                );
            }

            const admin = await AdminModel.findOne({ email });
            if (!admin) {
                console.error(error);
                return next(
                    createHttpError(HTTPStatus.UNAUTHORIZED, {
                        code: "INVALID_CREDENTIALS",
                        message: "Invalid credentials",
                    })
                );
            }

            // Password matching
            const isPasswordMatched = await comparePassword(
                password,
                admin.password
            );
            if (!isPasswordMatched) {
                return next(
                    createHttpError(HTTPStatus.UNAUTHORIZED, {
                        code: "INVALID_CREDENTIALS",
                        message: "Invalid credentials",
                    })
                );
            }

            // Generate token and create session
            const token = jwt.sign({ _id: admin._id }, ACCESS_TOKEN_SECRET, {
                expiresIn: "7d",
            });
            const session = await SessionModel.create({
                admin: admin._id,
                device: {
                    type: req.deviceInfo.type,
                    os: req.deviceInfo.os,
                    browser: req.deviceInfo.browser,
                },
                ipAddress: req.deviceInfo.ip,
                userAgent: req.deviceInfo.userAgent,
                token: token,
            });

            res.status(HTTPStatus.SUCCESS).json({
                success: true,
                token: session.token,
            });
        } catch (error) {
            logger.error(
                `Failed to register admin: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    },

    async register(req, res, next) {
        try {
            const { email, role, password, confirmPassword } = req.body;

            // Validation
            const { error } = registerSchema.validate({
                email,
                role,
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

            const admin = await AdminModel.findOne({ email });
            if (admin) {
                return next(
                    createHttpError(ErrorStatusCode.AUTH_INVALID_CREDENTIALS, {
                        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
                        message: "Admin already Exists!",
                    })
                );
            }

            // Hash the password and generate new admin id
            const hashPassword = await hashPasswordFn(password);
            const adminId = genAdminId();

            await AdminModel.insertOne({
                email,
                role,
                adminId,
                password: hashPassword,
            });

            res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                success: true,
                message: "New Admin Created Successfully",
            });
        } catch (error) {
            logger.error(
                `Failed to register admin: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    },
};

export default AdminAuthController;
