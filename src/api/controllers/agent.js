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
import notificationService, {
    countNotifications,
    countUnreadNotifications,
    markNotificationReadService,
} from "../service/notification.js";
import logger from "../../logging/index.js";
import agentService from "../service/agent.js";
import {
    activeReferrals,
    countLatestReferrals,
    countActiveReferrals,
    countPendingReferrals,
    countUsedReferrals,
    pendingReferrals,
    usedReferrals,
    latestReferrals,
} from "../service/referral.js";

const AgentController = {
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
    },

    async getAgentReferrals(req, res, next) {
        try {
            const limit = parseInt(req.query.limit) || 20;
            const page = parseInt(req.query.page) || 1;
            const status = req.query["refer-code-status"] || "latest";
            const skip = (page - 1) * limit;

            let agent;
            let total;

            switch (status) {
                case "latest":
                    agent = await latestReferrals(req, skip, limit);
                    total = await countLatestReferrals(req);
                    break;

                case "active":
                    agent = await activeReferrals(req, skip, limit);
                    total = await countActiveReferrals(req);
                    break;

                case "pending":
                    agent = await pendingReferrals(req, skip, limit);
                    total = await countPendingReferrals(req);
                    break;

                case "used":
                    agent = await usedReferrals(req, skip, limit);
                    total = await countUsedReferrals(req);
                    break;
            }

            return res.status(SuccessStatusCode.RESOURCE_CREATED).json({
                agent,
                total,
            });
        } catch (error) {
            logger.error(
                `Failed to get agent referrals: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    },

    async getNotifications(req, res, next) {
        try {
            const limit = NOTIFICATION_PER_PAGE; // 15 notification
            const { page } = req.query || 1;
            const skip = (page - 1) * limit;

            const notifications = await notificationService.notifications({
                agentID: req.user._id,
                skip,
                limit,
            });
            const total = await notificationService.countNotification(
                req.user._id
            );

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
    },

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

            await agentService.updateProfile({
                agentID: req.user._id,
                name,
                phoneNumber,
                addressLine1,
                addressLine2,
                city,
                state,
            });

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
    },

    async addBankDetails(req, res, next) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { bankName, accountHolderName, accountNumber, ifscCode } =
                req.body;

            const { error } = BankValidation.validate(req.body);
            if (error) {
                session.abortTransaction();
                session.endSession();

                return next(
                    createHttpError(ErrorStatusCode.VALIDATION_INVALID_FORMAT, {
                        code: ErrorCodes.VALIDATION_INVALID_FORMAT,
                        message: "Validation error",
                    })
                );
            }

            await agentService.addBankAccount({
                agentID: req.user._id,
                bankName,
                accountHolderName,
                accountNumber,
                ifscCode,
            });

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
    },

    async setBankAccountPrimary(req, res, next) {
        try {
            await agentService.setBankAccountPrimary({
                agentID: req.user._id,
                bankID: req.body.bankId,
            });

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
    },

    async getWithdrawalHistory(req, res, next) {
        try {
            const withdrawalHistory = await adminService.withdrawalHistory(
                req.user._id
            );

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
    },

    async markNotificationRead(req, res, next) {
        try {
            // Update notification status to read
            await notificationService.markNotificationRead(req.user._id);

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
    },
};

export default AgentController;
