import createHttpError from "http-errors";
import adminService from "../service/admin.js";
import logger from "../../logging/index.js";

import {
    ErrorStatusCode,
    ErrorCodes,
    SuccessStatusCode,
    HTTPStatus,
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
    ValidateMultipleUserQuery,
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

            res.status(HTTPStatus.SUCCESS).json({
                totalReferralUser,
                totalPaidToReferralUser,
                totalLatestWithdrawalRequest,
                totalOrdersCompleted,
            });
        } catch (error) {
            logger.error(`GET admin-dashboard-analytics: ${error.message}`);

            res.status(HTTPStatus.SERVER_ERROR).json({
                error: {
                    code: "SERVER_ERROR",
                    message: error.message,
                },
            });
            next(
                createHttpError(HTTPStatus.SERVER_ERROR, {
                    code: "SERVER_ERROR",
                    message: error.message,
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
                return res.status(HTTPStatus.BAD_REQUEST).json({
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Query is invalid",
                        details: {
                            field: error.details[0].path[0],
                            message: error.details[0].message,
                        },
                    },
                });
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

            return res.status(HTTPStatus.SUCCESS).json({
                referralUsers: referralUsers,
                rowCount: totalReferralUser,
                totalPages: totalPages,
            });
        } catch (error) {
            logger.error(`GET multiple-referral-users: ${error.message}`);

            res.status(HTTPStatus.SERVER_ERROR).json({
                error: {
                    code: "SERVER_ERROR",
                    message: error.message,
                },
            });
        }
    },

    getMultipleUsers: async (req, res, next) => {
        try {
            const {
                page = 1,
                pageSize = 10,
                search = undefined,
                searchFor = undefined,
                sortBy = undefined,
                sortDir = "asc",
            } = req.query;

            // Validate query of request
            const { error } = ValidateMultipleUserQuery.validate({
                page,
                pageSize,
                search,
                searchFor,
                sortBy,
                sortDir,
            });
            if (error) {
                return next(
                    createHttpError(HTTPStatus.BAD_REQUEST, {
                        code: "INVALIDATION_QUERY",
                        message: "Query is Invalid",
                        details: {
                            field: error.details[0].path[0],
                            message: error.details[0].message,
                        },
                    })
                );
            }

            const result =
                await adminService.getMultipleReferralUsers({
                    page,
                    pageSize,
                    search,
                    searchFor,
                    sortBy,
                    sortDir,
                });

            res.status(HTTPStatus.SUCCESS).json({
                referralUsers: result[0]?.referralUsers,
                rows: result[0]?.totalCount[0]?.total || 0,
            })
        } catch (error) {
            logger.error(`GET: referrals ${error.message}`);

            return next(
                createHttpError(HTTPStatus.SERVER_ERROR, {
                    code: "SERVER_ERROR",
                    message: error.message,
                })
            );
        }
    },

    getOneReferralUser: async (req, res, next) => {
        try {
            const { referralUserID } = req.params;

            if (!objectIdValidation(referralUserID)) {
                return next(
                    createHttpError(HTTPStatus.BAD_REQUEST, {
                        code: "VALIDATION_FORMAT",
                        message: "User ID is invalid",
                    })
                );
            }

            const referralUser = await adminService.getReferralUserById(
                referralUserID
            );
            if (!referralUser) {
                return next(
                    createHttpError(HTTPStatus.NOT_FOUND, {
                        code: "USER_NOT_FOUND",
                        message: "User not found",
                    })
                );
            }

            res.status(HTTPStatus.SUCCESS).json({
                success: true,
                referralUser,
            });
        } catch (error) {
            logger.error(`GET: referral-user: ${error.message}`);

            next(
                createHttpError(HTTPStatus.SERVER_ERROR, {
                    code: "SERVER_ERROR",
                    message: "Internal Server Error",
                })
            );
        }
    },

    getWithdrawals: async (req, res, next) => {
        const LIMIT = 50;
        const statusList = ["pending", "approved", "rejected"];

        try {
            let {
                withdrawalStatus = "pending",
                page = 1,
                search = "",
                fromDate = new Date(0),
                toDate = new Date(),
            } = req.query;

            let withdrawals, rows;

            if (statusList.includes(withdrawalStatus)) {
                fromDate = new Date(fromDate);
                toDate = new Date(toDate);

                const withdrawals = await adminService.getWithdrawal({
                    withdrawalStatus,
                    page,
                    search,
                    fromDate,
                    toDate,
                    LIMIT,
                });

                return res.status(HTTPStatus.SUCCESS).json({
                    rows: withdrawals[0]?.totalCount[0]?.total || 0,
                    withdrawals: withdrawals[0]?.withdrawals || [],
                    status: withdrawalStatus,
                });
            } else {
                return next(
                    createHttpError(HTTPStatus.BAD_REQUEST, {
                        code: "INVALIDATE_REFERRAL_STATUS",
                        message: "Referral status is invalid",
                    })
                );
            }

            // switch (withdrawalStatus) {
            //     case "pending":
            //         if (search === "") {
            //             withdrawals = await WithdrawalModel.find({
            //                 status: "pending",
            //                 createdAt: {
            //                     $gte: fromDate.toISOString(),
            //                     $lte: toDate.toISOString(),
            //                 },
            //             })
            //                 .populate({ path: "user", select: "email" })
            //                 .sort({ createdAt: -1 })
            //                 .skip(LIMIT * (page - 1))
            //                 .limit(LIMIT)
            //                 .lean();
            //             rows = await WithdrawalModel.countDocuments({
            //                 status: "pending",
            //             });
            //         } else {
            //             withdrawals =
            //                 await adminService.findWithdrawalUsingSearchTerm({
            //                     withdrawalStatus,
            //                     page,
            //                     search,
            //                     fromDate,
            //                     toDate,
            //                     limit: LIMIT,
            //                 });
            //             rows =
            //                 await adminService.findWithdrawalCountUsingSearchTerm(
            //                     { withdrawalStatus, search }
            //                 );
            //         }
            //         break;

            //     case "approved":
            //         if (search === "") {
            //             withdrawals = await WithdrawalModel.find({
            //                 status: "approved",
            //                 processedAt: {
            //                     $gte: fromDate.toISOString(),
            //                     $lte: toDate.toISOString(),
            //                 },
            //             })
            //                 .populate({ path: "user", select: "email" })
            //                 .sort({ updatedAt: -1 })
            //                 .skip(LIMIT * (page - 1))
            //                 .limit(LIMIT)
            //                 .lean();
            //             rows = await WithdrawalModel.countDocuments({
            //                 status: "approved",
            //             });
            //         } else {
            //             withdrawals =
            //                 await adminService.findWithdrawalUsingSearchTerm({
            //                     withdrawalStatus,
            //                     page,
            //                     search,
            //                     fromDate,
            //                     toDate,
            //                     limit: LIMIT,
            //                 });
            //             rows =
            //                 await adminService.findWithdrawalCountUsingSearchTerm(
            //                     { withdrawalStatus, search }
            //                 );
            //         }
            //         break;

            //     case "rejected":
            //         if (search === "") {
            //             withdrawals = await WithdrawalModel.find({
            //                 status: "rejected",
            //                 processedAt: {
            //                     $gte: fromDate.toISOString(),
            //                     $lte: toDate.toISOString(),
            //                 },
            //             })
            //                 .populate({ path: "user", select: "email" })
            //                 .sort({ updatedAt: -1 })
            //                 .skip(LIMIT * (page - 1))
            //                 .limit(LIMIT)
            //                 .lean();
            //             rows = await WithdrawalModel.countDocuments({
            //                 status: "rejected",
            //             });
            //         } else {
            //             withdrawals =
            //                 await adminService.findWithdrawalUsingSearchTerm({
            //                     withdrawalStatus,
            //                     page,
            //                     search,
            //                     fromDate,
            //                     toDate,
            //                     limit: LIMIT,
            //                 });
            //             rows =
            //                 await adminService.findWithdrawalCountUsingSearchTerm(
            //                     { withdrawalStatus, search }
            //                 );
            //         }
            // }

            return res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                withdrawals,
                rows,
                withdrawalStatus,
            });
        } catch (error) {
            logger.error(`GET: withdrawals: ${error.message}`);

            return next(
                createHttpError(HTTPStatus.SERVER_ERROR, {
                    code: "SERVER_ERROR",
                    message: error.message,
                })
            );
        }
    },

    getReferralUserBalance: async (req, res, next) => {
        try {
            const { referralUserId } = req.query;

            const userInfo = await ReferralUserModelV1.findById(referralUserId)
                .select(
                    `user wallet.balance wallet.pendingBalance 
                    wallet.pendingWithdrawal wallet.totalEarning`
                )
                .populate({
                    path: "user",
                    select: "fullName",
                });

            res.json({
                userInfo,
            });
        } catch (error) {
            logger.error(`GET: referral-user-balance ${error.message}`);

            return next(
                createHttpError(HTTPStatus.SERVER_ERROR, {
                    code: "SERVER_ERROR",
                    message: error.message,
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
                    createHttpError(HTTPStatus.BAD_REQUEST, {
                        code: "VALIDATION_FORMAT",
                        message: "Withdrawal ID is invalid",
                    })
                );
            }
            const { error } = processWithdrawalValidation.validate({
                processType,
                remarks,
            });
            if (error) {
                return next(
                    createHttpError(HTTPStatus.BAD_REQUEST, {
                        code: "VALIDATION_FORMAT",
                        message: "Process type and remarks is invalid",
                    })
                );
            }

            const withdrawalRequest = await findWithdrawalRequestById(
                withdrawalID
            );

            if (withdrawalRequest && withdrawalRequest.status === "pending") {
                const message = await adminService.processWithdrawalRequest({
                    processType,
                    transaction_id: transactionId,
                    remarks,
                    withdrawalRequest,
                });

                return res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                    success: true,
                    message,
                });
            }

            return res.status(HTTPStatus.SUCCESS).json({
                success: true,
                message: "Withdrawal Request is Already Approved or Not Exits!",
            });
        } catch (error) {
            logger.error(`PATCH: process-withdrawal ${error.message}`);

            return next(
                createHttpError(HTTPStatus.SERVER_ERROR, {
                    code: "SERVER_ERROR",
                    message: error.message,
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
                    createHttpError(HTTPStatus.NOT_FOUND, {
                        code: "ACTION_NOT_FOUND",
                        message: "Provided action is inavalid!",
                    })
                );
            }

            res.status(HTTPStatus.SUCCESS).json({
                success: true,
                message: `${accountStatus} action is successfuly completed!`,
            });
        } catch (error) {
            logger.error(`PATCH: change-account-status ${error.message}`);

            return next(
                createHttpError(HTTPStatus.SERVER_ERROR, {
                    code: "SERVER_ERROR",
                    message: error.message,
                })
            );
        }
    },

    getReferralOverTime: async (req, res, next) => {
        try {
            const { defineTime = "last7Days" } = req.query;

            let currentDate = new Date();
            let prevDate = new Date();

            currentDate.setUTCHours(0, 0, 0, 0);
            prevDate.setUTCHours(0, 0, 0, 0);

            if (defineTime === "last7Days") {
                prevDate.setDate(currentDate.getDate() - 7);
            } else if (defineTime === "thisMonth") {
                prevDate.setDate(1);
            } else if (defineTime === "lastMonth") {
                prevDate.setMonth(currentDate.getMonth() - 1);
                prevDate.setDate(1);
                currentDate.setDate(0);
            }

            const referralOverTimeData = await adminService.getReferralOverTime(
                {
                    fromDate: prevDate,
                    toDate: currentDate,
                }
            );

            res.json({
                success: true,
                referralOverTimeData,
                defineTime,
            });
        } catch (error) {
            logger.error(`GET: referral-over-time ${error.message}`);

            return next(
                createHttpError(HTTPStatus.SERVER_ERROR, {
                    code: "SERVER_ERROR",
                    message: error.message,
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
            logger.error(`GET: latest-payouts ${error.message}`);

            return next(
                createHttpError(HTTPStatus.SERVER_ERROR, {
                    code: "SERVER_ERROR",
                    message: error.message,
                })
            );
        }
    },

    controlCronJob: async (req, res, next) => {
        try {
            const { state } = req.params;

            await referralScript(res, state);
        } catch (error) {
            logger.error(`PATCH: control-cron-job ${error.message}`);

            return next(
                createHttpError(HTTPStatus.SERVER_ERROR, {
                    code: "SERVER_ERROR",
                    message: error.message,
                })
            );
        }
    },

    getCronJobStatus: async (req, res, next) => {
        try {
            await cronJobStatus(res);
        } catch (error) {
            logger.error(`GET: cron-job-status ${error.message}`);

            return next(
                createHttpError(HTTPStatus.SERVER_ERROR, {
                    code: "SERVER_ERROR",
                    message: error.message,
                })
            );
        }
    },

    getReferralSettings: async (req, res, next) => {
        try {
            const result = await ReferralRuleModel.findOne().select(
                "-_id -createdAt -updatedAt"
            );

            res.status(HTTPStatus.SUCCESS).json({
                result,
            });
        } catch (error) {
            logger.error(`GET: referral-settings ${error.message}`);

            return next(
                createHttpError(HTTPStatus.SERVER_ERROR, {
                    code: "SERVER_ERROR",
                    message: error.message,
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

            res.status(HTTPStatus.SUCCESS).json({
                success: true,
            });
        } catch (error) {
            logger.error(`PATCH: change-referral-settings ${error.message}`);

            return next(
                createHttpError(HTTPStatus.SERVER_ERROR, {
                    code: "SERVER_ERROR",
                    message: error.message,
                })
            );
        }
    },

    updateReferralSchedule: async (req, res, next) => {
        try {
            const { schedule, scheduleTime } = req.body;

            await ReferralRuleModel.findOneAndUpdate(
                {},
                { referralScript: { schedule, scheduleTime } },
                {
                    upsert: false,
                }
            );

            res.status(HTTPStatus.SUCCESS).json({
                success: true,
            });
        } catch (error) {
            logger.error(`PATCH: referral-schedule ${error.message}`);

            return next(
                createHttpError(HTTPStatus.SERVER_ERROR, {
                    code: "SERVER_ERROR",
                    message: error.message,
                })
            );
        }
    },

    getReferral: async (req, res, next) => {
        const LIMIT = 50;
        const statusList = ["pending", "completed", "cancelled"];

        try {
            let {
                referralStatus = "pending",
                page = 1,
                search = "",
                fromDate = new Date(0),
                toDate = new Date(),
                searchIn = "referrer",
                id = "",
                searchIdIn = "referId",
            } = req.query;

            if (statusList.includes(referralStatus)) {
                fromDate = new Date(fromDate);
                toDate = new Date(toDate);

                const referrals = await adminService.getReferral({
                    page,
                    referralStatus,
                    search,
                    fromDate,
                    toDate,
                    searchIn,
                    id,
                    searchIdIn,
                    LIMIT,
                });

                return res.status(HTTPStatus.SUCCESS).json({
                    rows: referrals[0]?.totalCount[0]?.total || 0,
                    referrals: referrals[0]?.referrals || [],
                    status: referralStatus,
                });
            } else {
                return next(
                    createHttpError(HTTPStatus.BAD_REQUEST, {
                        code: "INVALIDATE_REFERRAL_STATUS",
                        message: "Referral status is invalid",
                    })
                );
            }
        } catch (error) {
            logger.error(`GET: referrals ${error.message}`);

            return next(
                createHttpError(HTTPStatus.SERVER_ERROR, {
                    code: "SERVER_ERROR",
                    message: error.message,
                })
            );
        }
    },
};

export default AdminController;
