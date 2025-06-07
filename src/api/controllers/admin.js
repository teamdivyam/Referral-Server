import createHttpError from "http-errors";
import adminService from "../service/admin.js";
import logger from "../../logging/index.js";

import {
    ErrorStatusCode,
    ErrorCodes,
    SuccessStatusCode,
} from "../../utils/constant.js";
import {
    activateAccount,
    deactivateAccount,
    findWithdrawalRequestById,
} from "../service/admin.js";
import {
    agentAccountStatus,
    objectIdValidation,
    processWithdrawalValidation,
    validatePageLimitSearch,
} from "../validators/admin.js";
import ReferralWithdrawalModel from "../../db/models/ReferralWithdrawalV1.js";
import TransactionModel from "../../db/models/transaction.js";

const AdminController = {
    async getDashboardAnalytics(req, res, next) {
        try {
            const [
                totalReferralUser,
                totalPaidToReferralUser,
                totalLatestWithdrawalRequest,
                totalOrdersCompleted,
            ] = await Promise.all([
                adminService.totalReferralUser(),
                adminService.totalPaidToReferralUser(),
                adminService.totalLatestWithdrawalRequest(),
                adminService.totalOrdersCompleted(),
            ]);

            res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                totalReferralUser,
                totalPaidToReferralUser,
                totalLatestWithdrawalRequest,
                totalOrdersCompleted,
            });
        } catch (error) {
            logger.error(
                `Error in retreiving admin dashboard analytics: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    },

    async getMultipleReferralUsers(req, res, next) {
        try {
            const { page = 1, limit = 100, search = "" } = req.query;

            const { error } = validatePageLimitSearch.validate({
                page,
                limit,
            });
            if (error) {
                return next(
                    createHttpError(ErrorStatusCode.VALIDATION_INVALID_FORMAT, {
                        code: ErrorCodes.VALIDATION_INVALID_FORMAT,
                        message: "Query Invalidation Error!",
                    })
                );
            }

            const referralUsers =
                await adminService.getReferralUserWithPageLimitSearch(
                    page,
                    limit,
                    search
                );

            const totalReferralUser = await adminService.totalReferralUser(
                search
            );
            const totalPages = Math.ceil(totalReferralUser / limit);

            return res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                referralUsers: referralUsers,
                rowCount: totalReferralUser,
                totalPages: totalPages,
            });
        } catch (error) {
            logger.error(
                `Error in retreiving agents: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    },

    async getOneReferralUser(req, res, next) {
        try {
            const { referralUserID } = req.params;

            if (!objectIdValidation(referralUserID)) {
                return next(
                    createHttpError(ErrorStatusCode.VALIDATION_INVALID_FORMAT, {
                        code: ErrorCodes.VALIDATION_INVALID_FORMAT,
                        message: "Query Invalidation Error!",
                    })
                );
            }

            const referralUser = await adminService.getReferralUserById(
                referralUserID
            );
            if (!referralUser) {
                return next(
                    createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
                        code: ErrorCodes.RESOURCE_NOT_FOUND,
                        message: "Referral user with this ID not found!",
                    })
                );
            }

            res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                success: true,
                referralUser,
            });
        } catch (error) {
            logger.error(
                `Error in retreiving agent by id: ${error.message}, Error stack: ${error.stack}`
            );

            next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    },

    async getWithdrawals(req, res, next) {
        const LIMIT = 50;
        try {
            const { withdrawalType = "latest", page = 1 } = req.query;

            let withdrawals, rows;

            switch (withdrawalType) {
                case "latest":
                    withdrawals = await ReferralWithdrawalModel.find({
                        status: "pending",
                    })
                        .sort({ updatedAt: -1 })
                        .skip(LIMIT * (page - 1))
                        .limit(LIMIT)
                        .lean();
                    rows = await ReferralWithdrawalModel.countDocuments({
                        status: "pending",
                    });
                    break;

                case "approved":
                    withdrawals = await ReferralWithdrawalModel.find({
                        status: "approved",
                    })
                        .sort({ updatedAt: -1 })
                        .skip(LIMIT * (page - 1))
                        .limit(LIMIT)
                        .lean();
                    rows = await ReferralWithdrawalModel.countDocuments({
                        status: "approved",
                    });
                    break;

                case "rejected":
                    withdrawals = await ReferralWithdrawalModel.find({
                        status: "rejected",
                    })
                        .sort({ updatedAt: -1 })
                        .skip(LIMIT * (page - 1))
                        .limit(LIMIT)
                        .lean();
                    rows = await ReferralWithdrawalModel.countDocuments({
                        status: "rejected",
                    });
            }

            return res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                withdrawals,
                rows,
                withdrawalType,
            });
        } catch (error) {
            logger.error(
                `Error in getting latest withdrawal request: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    },

    async processWithdrawalRequest(req, res, next) {
        try {
            const { processType, withdrawalID } = req.params;
            const { transactionId = null, remarks = null } = req.body;

            if (!objectIdValidation(withdrawalID)) {
                return next(
                    createHttpError(ErrorStatusCode.VALIDATION_INVALID_FORMAT, {
                        code: ErrorCodes.VALIDATION_INVALID_FORMAT,
                        message: "Query Invalidation Error!",
                    })
                );
            }
            const { error } = processWithdrawalValidation.validate({
                processType,
                remarks,
            });
            if (error) {
                return next(
                    createHttpError(ErrorStatusCode.VALIDATION_INVALID_FORMAT, {
                        code: ErrorCodes.VALIDATION_INVALID_FORMAT,
                        message: "Query and Body Invalidation Error!",
                    })
                );
            }

            const withdrawalRequest = await findWithdrawalRequestById(
                withdrawalID
            );

            if (withdrawalRequest && withdrawalRequest.status === "pending") {
                const message = await adminService.processWithdrawalRequest({
                    processType,
                    transactionId,
                    remarks,
                    withdrawalRequest,
                });

                return res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                    success: true,
                    message,
                });
            }

            return res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                success: true,
                message: "Withdrawal Request is Already Approved or Not Exits!",
            });
        } catch (error) {
            logger.error(
                `Error in approved withdraw request: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    },

    async changeReferralUserAccountStatus(req, res, next) {
        try {
            const { accountStatus, referralUserID } = req.params;

            if (!objectIdValidation(referralUserID)) {
                return next(
                    createHttpError(ErrorStatusCode.VALIDATION_INVALID_FORMAT, {
                        code: ErrorCodes.VALIDATION_INVALID_FORMAT,
                        message: "Query Invalidation Error!",
                    })
                );
            }
            const { error } = agentAccountStatus.validate(accountStatus);
            if (error) {
                return next(
                    createHttpError(ErrorStatusCode.VALIDATION_INVALID_FORMAT, {
                        code: ErrorCodes.VALIDATION_INVALID_FORMAT,
                        message: "Query Invalidation Error!",
                    })
                );
            }

            if (accountStatus === "deactive") {
                await deactivateAccount(referralUserID);
            } else if (accountStatus === "active") {
                await activateAccount(referralUserID);
            } else {
                return next(
                    createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
                        code: ErrorCodes.RESOURCE_NOT_FOUND,
                        message: "Provided action is inavalid!",
                    })
                );
            }

            res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                success: true,
                message: `${accountStatus} action is successfuly completed!`,
            });
        } catch (error) {
            logger.error(
                `Error in taking action on agent account: ${error.message}, Error stack: ${error.stack}`
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

export default AdminController;
