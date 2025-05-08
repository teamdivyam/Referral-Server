import createHttpError from "http-errors";
import logger from "../../logging/index.js";
import { comparePassword, hashPasswordFn } from "../../utils/password.js";
import jwt from "jsonwebtoken";
import AdminModel from "../../db/models/admin.js";
import {
    ACCESS_TOKEN_SECRET,
    ErrorCodes,
    ErrorStatusCode,
    SuccessStatusCode,
} from "../../utils/constant.js";
import {
    loginValidationSchema,
    registerValidationSchema,
} from "../validators/auth.js";

const AdminAuthController = {
    async login(req, res, next) {
        try {
            const { email, password } = req.body;

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

            const admin = await AdminModel.findOne({ email });
            if (!admin) {
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
                admin.passwordHash
            );
            if (!isPasswordMatched) {
                return next(
                    createHttpError(ErrorStatusCode.AUTH_INVALID_CREDENTIALS, {
                        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
                        message: "Invalid credentials",
                    })
                );
            }

            // Generate tokens
            const token = jwt.sign({ _id: admin._id }, ACCESS_TOKEN_SECRET, {
                expiresIn: "7d",
            });

            res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                success: true,
                token,
            });
        } catch (error) {}
    },

    async register(req, res, next) {
        try {
            const { email, password, confirmPassword } = req.body;

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

            const admin = await AdminModel.findOne({ email });
            if (admin) {
                return next(
                    createHttpError(ErrorStatusCode.AUTH_INVALID_CREDENTIALS, {
                        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
                        message: "Admin already Exists!",
                    })
                );
            }

            // Hash password
            const passwordHash = await hashPasswordFn(password);

            await AdminModel.insertOne({
                email,
                passwordHash,
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
