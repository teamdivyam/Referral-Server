import mongoose from "mongoose";
import createHttpError from "http-errors";

import AgentModel from "../../db/models/agent.js";
import { ProfileValidation, BankValidation } from "../validators/agent.js";
import {
    ErrorStatusCode,
    ErrorCodes,
    SuccessStatusCode,
    MINIMUM_WITHDRAWAL_AMOUNT,
    NOTIFICATION_PER_PAGE,
} from "../../utils/constant.js";
import {
    countNotifications,
    countUnreadNotifications,
    markNotificationReadService,
    notificationService,
} from "../service/notification.js";
import logger from "../../logging/index.js";
import { withdrawalHistoryService } from "../service/agent.js";

class AgentController {
    async me(req, res, next) {
        const {
            // Agent basic info
            name,
            email,
            phoneNumber,
            address,
            userProfileCompleteStatus,

            // Wallet Info
            wallet: {
                totalEarningAmount,
                pendingWithdrawalAmount,
                balance,
                pendingBalance,
            },

            // bank accounts
            bankAccounts,
        } = req.user;

        try {
            const unreadNotificationCount = await countUnreadNotifications(
                req.user._id
            );

            res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                user: {
                    /* Basic Info */
                    name,
                    email,
                    phoneNumber,
                    address,
                    userProfileCompleteStatus,

                    // Wallet Info
                    totalEarningAmount,
                    pendingWithdrawalAmount,
                    balance,
                    pendingBalance,

                    // Bank info
                    bankAccounts,

                    // Notification
                    unreadNotificationCount,

                    // Constant
                    MINIMUM_WITHDRAWAL_AMOUNT,
                },
            });
        } catch (error) {
            logger.error(
                `Failed to get agent data: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    }

    async getNotifications(req, res, next) {
        try {
            const limit = NOTIFICATION_PER_PAGE; // 15 notification
            const { page } = req.query || 1;
            const skip = (page - 1) * limit;

            const notifications = await notificationService(
                req.user._id,
                skip,
                limit
            );
            const total = await countNotifications(req.user._id);

            return res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                notifications,
                total,
            });
        } catch (error) {
            logger.error(
                `Failed to get agent notifications: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    }

    async updateProfile(req, res, next) {
        try {
            const {
                name,
                phoneNumber,
                addressLine1,
                addressLine2,
                city,
                state,
            } = req.body;

            const { error } = ProfileValidation.validate(req.body);
            if (error) {
                return next(
                    createHttpError(ErrorStatusCode.VALIDATION_INVALID_FORMAT, {
                        code: ErrorCodes.VALIDATION_INVALID_FORMAT,
                        message: error.details[0].message,
                    })
                );
            }

            await AgentModel.updateOne(
                { _id: req.user._id },
                {
                    $set: {
                        name,
                        phoneNumber,
                        address: { addressLine1, addressLine2, city, state },
                        "userProfileCompleteStatus.profile": true,
                    },
                }
            );

            return res.status(SuccessStatusCode.RESOURCE_UPDATED).json({
                success: true,
                message: "Profile updated successfully",
            });
        } catch (error) {
            logger.error(
                `Failed to update agent profile: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    }

    async addBankDetails(req, res, next) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { bankName, accountHolderName, accountNumber, ifscCode } =
                req.body;

            const { error } = BankValidation.validate(req.body);
            if (error) {
                console.log("Validation error:", error.details[0].message);

                session.abortTransaction();
                session.endSession();

                return next(
                    createHttpError(ErrorStatusCode.VALIDATION_INVALID_FORMAT, {
                        code: ErrorCodes.VALIDATION_INVALID_FORMAT,
                        message: "Validation error",
                    })
                );
            }

            await AgentModel.updateOne(
                { _id: req.user._id },
                {
                    $push: {
                        bankAccounts: {
                            bankName,
                            accountHolderName,
                            accountNumber,
                            ifscCode,
                        },
                    },
                    $set: {
                        "userProfileCompleteStatus.bank": true,
                    },
                },
                { session }
            );

            await session.commitTransaction();
            session.endSession();

            return res.status(SuccessStatusCode.RESOURCE_UPDATED).json({
                success: true,
                message: "Bank details updated successfully",
            });
        } catch (error) {
            logger.error(
                `Failed to add bank details: ${error.message}, Error stack: ${error.stack}`
            );

            await session.abortTransaction();
            session.endSession();

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    }

    async setBankAccountPrimary(req, res, next) {
        try {
            const bankId = req.body.bankId;

            const agent = await AgentModel.findById(req.user._id);

            agent.bankAccounts.forEach((bank) => {
                bank.isPrimary = bank._id.equals(bankId); // true for selected, false for others
            });

            await agent.save();

            res.status(SuccessStatusCode.RESOURCE_UPDATED).json({
                success: true,
                message: "Bank account updated successfully",
            });
        } catch (error) {
            logger.error(
                `Failed to set bank account primary: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: error.message,
                })
            );
        }
    }

    async getWithdrawalHistory(req, res, next) {
        try {
            const withdrawalHistory = await withdrawalHistoryService();

            return res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                withdrawalHistory,
            });
        } catch (error) {
            logger.error(
                `Failed to get withdrawal history: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: error.message,
                })
            );
        }
    }

    async markNotificationRead(req, res, next) {
        try {
            // Update notification status to read
            await markNotificationReadService(req.user._id);

            return res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                success: true,
                message: "Notifications marked as read",
            });
        } catch (error) {
            logger.error(
                `Failed to mark notification readed: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    }
}

export default new AgentController();
