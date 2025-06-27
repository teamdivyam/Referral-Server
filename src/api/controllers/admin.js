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
import WithdrawalModel from "../../db/models/ReferralWithdrawalV1.js";
import ReferralEventModel from "../../db/models/ReferralEventsV1.js";
import ReferralUserModelV1 from "../../db/models/ReferralUserV1.js";
import { cronJobStatus, referralScript } from "../../../scripts/referral.js";
import ReferralRuleModel from "../../db/models/ReferralRules.js";

const AdminController = {
    getDashboardAnalytics: async (req, res, next) => {
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

    getMultipleReferralUsers: async (req, res, next) => {
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

    getOneReferralUser: async (req, res, next) => {
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

    getWithdrawals: async (req, res, next) => {
        const LIMIT = 50;
        try {
            let {
                withdrawalStatus = "pending",
                page = 1,
                search = "",
                fromDate = new Date(0),
                toDate = new Date(),
            } = req.query;

            let withdrawals, rows;

            fromDate = new Date(fromDate);
            toDate = new Date(toDate);

            switch (withdrawalStatus) {
                case "pending":
                    if (search === "") {
                        withdrawals = await WithdrawalModel.find({
                            status: "pending",
                            createdAt: {
                                $gte: fromDate.toISOString(),
                                $lte: toDate.toISOString(),
                            },
                        })
                            .populate({ path: "user", select: "email" })
                            .sort({ updatedAt: 1 })
                            .skip(LIMIT * (page - 1))
                            .limit(LIMIT)
                            .lean();
                        rows = await WithdrawalModel.countDocuments({
                            status: "pending",
                        });
                    } else {
                        withdrawals =
                            await adminService.findWithdrawalUsingSearchTerm({
                                withdrawalStatus,
                                page,
                                search,
                                fromDate,
                                toDate,
                                limit: LIMIT,
                            });
                        rows =
                            await adminService.findWithdrawalCountUsingSearchTerm(
                                { withdrawalStatus, search }
                            );
                    }
                    break;

                case "approved":
                    if (search === "") {
                        withdrawals = await WithdrawalModel.find({
                            status: "approved",
                            processedAt: {
                                $gte: fromDate.toISOString(),
                                $lte: toDate.toISOString(),
                            },
                        })
                            .populate({ path: "user", select: "email" })
                            .sort({ updatedAt: -1 })
                            .skip(LIMIT * (page - 1))
                            .limit(LIMIT)
                            .lean();
                        rows = await WithdrawalModel.countDocuments({
                            status: "approved",
                        });
                    } else {
                        withdrawals =
                            await adminService.findWithdrawalUsingSearchTerm({
                                withdrawalStatus,
                                page,
                                search,
                                fromDate,
                                toDate,
                                limit: LIMIT,
                            });
                        rows =
                            await adminService.findWithdrawalCountUsingSearchTerm(
                                { withdrawalStatus, search }
                            );
                    }
                    break;

                case "rejected":
                    if (search === "") {
                        withdrawals = await WithdrawalModel.find({
                            status: "rejected",
                            processedAt: {
                                $gte: fromDate.toISOString(),
                                $lte: toDate.toISOString(),
                            },
                        })
                            .populate({ path: "user", select: "email" })
                            .sort({ updatedAt: -1 })
                            .skip(LIMIT * (page - 1))
                            .limit(LIMIT)
                            .lean();
                        rows = await WithdrawalModel.countDocuments({
                            status: "rejected",
                        });
                    } else {
                        withdrawals =
                            await adminService.findWithdrawalUsingSearchTerm({
                                withdrawalStatus,
                                page,
                                search,
                                fromDate,
                                toDate,
                                limit: LIMIT,
                            });
                        rows =
                            await adminService.findWithdrawalCountUsingSearchTerm(
                                { withdrawalStatus, search }
                            );
                    }
            }

            return res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                withdrawals,
                rows,
                withdrawalStatus,
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

    getReferralUserBalance: async (req, res, next) => {
        try {
            const { referralUserId } = req.query;

            const userInfo = await ReferralUserModelV1.findById(referralUserId)
                .select(
                    "user wallet.balance wallet.pendingBalance wallet.pendingWithdrawal wallet.totalEarning"
                )
                .populate({
                    path: "user",
                    select: "fullName",
                });

            res.json({
                userInfo,
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

    processWithdrawalRequest: async (req, res, next) => {
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

    changeReferralUserAccountStatus: async (req, res, next) => {
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

            if (accountStatus === "deactivate") {
                await deactivateAccount(referralUserID);
            } else if (accountStatus === "activate") {
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

    getReferralOverTime: async (req, res, next) => {
        try {
            const { defineTime = "last7Days" } = req.query;

            let referralEventData;
            let referralOverTimeData = [];

            const cDate = new Date();
            let pDate = new Date(cDate);
            switch (defineTime) {
                case "last7Days":
                    pDate.setDate(cDate.getDate() - 7);
                    referralEventData = await ReferralEventModel.find({
                        createdAt: {
                            $gte: pDate.toISOString(),
                            $lt: cDate.toISOString(),
                        },
                    });
                    for (let i = pDate.getDate(); i < cDate.getDate(); i++) {
                        referralOverTimeData.push({ day: i, referral: 0 });
                    }
                    for (let i = 0; i < referralOverTimeData.length; i++) {
                        const dateToFilter = referralOverTimeData[i].day;

                        referralEventData.forEach((res) => {
                            const getDate = new Date(res.createdAt).getDate();

                            if (getDate === dateToFilter) {
                                referralOverTimeData[i].referral += 1;
                            }
                        });
                    }
                    break;

                case "thisMonth":
                    pDate.setDate(1);
                    referralEventData = await ReferralEventModel.find({
                        createdAt: {
                            $gte: pDate.toISOString(),
                            $lt: cDate.toISOString(),
                        },
                    });
                    for (let i = pDate.getDate(); i < cDate.getDate(); i++) {
                        referralOverTimeData.push({ day: i, referral: 0 });
                    }
                    for (let i = 0; i < referralOverTimeData.length; i++) {
                        const dateToFilter = referralOverTimeData[i].day;

                        referralEventData.forEach((res) => {
                            const getDate = new Date(res.createdAt).getDate();

                            if (getDate === dateToFilter) {
                                referralOverTimeData[i].referral += 1;
                            }
                        });
                    }
                    break;

                case "lastMonth":
                    pDate.setDate(cDate.getDate() - cDate.getDate() - 30);
                    cDate.setDate(0);
                    referralEventData = await ReferralEventModel.find({
                        createdAt: {
                            $gte: pDate.toISOString(),
                            $lt: cDate.toISOString(),
                        },
                    });
                    for (let i = pDate.getDate(); i < cDate.getDate(); i++) {
                        referralOverTimeData.push({ day: i, referral: 0 });
                    }
                    for (let i = 0; i < referralOverTimeData.length; i++) {
                        const dateToFilter = referralOverTimeData[i].day;

                        referralEventData.forEach((res) => {
                            const getDate = new Date(res.createdAt).getDate();

                            if (getDate === dateToFilter) {
                                referralOverTimeData[i].referral += 1;
                            }
                        });
                    }
                    break;
            }

            res.json({
                success: true,
                referralOverTimeData,
                defineTime,
            });
        } catch (error) {
            logger.error(
                `Error in verify referral code: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    },

    getLatestPayout: async (req, res, next) => {
        const LIMIT = 7;
        try {
            const { page = 1 } = req.query;
            const latestPayout = await WithdrawalModel.find({
                $or: [
                    { status: "approved" },
                    { status: "rejected" },
                    { status: "paid" },
                ],
            })
                .sort({ updatedAt: -1 })
                .skip((page - 1) * LIMIT)
                .limit(LIMIT);

            const rows = await WithdrawalModel.countDocuments({
                $or: [
                    { status: "approved" },
                    { status: "rejected" },
                    { status: "paid" },
                ],
            });

            res.json({
                success: true,
                latestPayout,
                rows,
            });
        } catch (error) {
            logger.error(
                `Error in getting latest payout: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    },

    controlCronJob: async (req, res, next) => {
        try {
            const { state } = req.params;

            await referralScript(res, state);
        } catch (error) {
            logger.error(
                `Error in controlling cron job: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    },

    getCronJobStatus: async (req, res, next) => {
        try {
            await cronJobStatus(res);
        } catch (error) {
            logger.error(
                `Error in getting cron job status: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    },

    getReferralSettings: async (req, res, next) => {
        try {
            const result = await ReferralRuleModel.findOne().select(
                "-_id -createdAt -updatedAt"
            );

            res.json({
                result,
            });
        } catch (error) {
            logger.error(
                `Error in getting referral settings: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    },

    changeReferralSettings: async (req, res, next) => {
        try {
            const { name, value } = req.body;
            const updateValue = {};
            updateValue[name] = value;

            await ReferralRuleModel.findOneAndUpdate({}, updateValue, {
                upsert: false,
            });

            res.json({ success: true });
        } catch (error) {
            logger.error(
                `Error in getting referral settings: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    },

    updateReferralSchedule: async (req, res, next) => {
        try {
            const { schedule, scheduleTime } = req.body;

            console.log(req.body);

            await ReferralRuleModel.findOneAndUpdate(
                {},
                { referralScript: { schedule, scheduleTime } },
                {
                    upsert: false,
                }
            );

            res.json({ success: true });
        } catch (error) {
            logger.error(
                `Error in updating referral schedule: ${error.message}, Error stack: ${error.stack}`
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
