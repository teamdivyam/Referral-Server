import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import AdminModel from "../../db/models/AdminModel.js";
import SessionModel from "../../db/models/SessionModel.js";
import logger from "../../logging/index.js";
import { genAdminId } from "../../utils/generateAdminId.js";
import { comparePassword, hashPasswordFn } from "../../utils/hashPassword.js";
import { loginSchema, registerSchema } from "../validators/auth.js";
import { ACCESS_TOKEN_SECRET, HTTPStatus } from "../../utils/constant.js";

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
                    createHttpError(HTTPStatus.FORBIDDEN, {
                        code: "INVALID_FORMAT",
                        message: error.details[0].message,
                    })
                );
            }

            const admin = await AdminModel.findOne({ email });
            if (!admin) {
                return next(
                    createHttpError(HTTPStatus.FORBIDDEN, {
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
                    createHttpError(HTTPStatus.FORBIDDEN, {
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
                `POST: login ${error.message}, Error stack: ${error.stack}`
            );

            next(
                createHttpError(HTTPStatus.SERVER_ERROR, {
                    code: "SERVER_ERROR",
                    message: error.message,
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
                return next(
                    createHttpError(HTTPStatus.BAD_REQUEST, {
                        code: "VALIDATION_FORMAT",
                        message: "Invalidation Error",
                    })
                );
            }

            const admin = await AdminModel.findOne({ email });
            if (admin) {
                return next(
                    createHttpError(HTTPStatus.SUCCESS, {
                        code: "ALREADY_EXISTS",
                        message: "Admin already exists!",
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

            res.status(HTTPStatus.SUCCESS).json({
                success: true,
                message: "New Admin Created Successfully",
            });
        } catch (error) {
            logger.error(
                `POST: register ${error.message}, Error stack: ${error.stack}`
            );

            next(
                createHttpError(HTTPStatus.SERVER_ERROR, {
                    code: "SERVER_ERROR",
                    message: error.message,
                })
            );
        }
    },
};

export default AdminAuthController;
