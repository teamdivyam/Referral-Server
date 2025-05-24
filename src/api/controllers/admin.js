import createHttpError from "http-errors";
import adminService from "../service/admin.js";
import logger from "../../logging/index.js";

import {
    ErrorStatusCode,
    ErrorCodes,
    SuccessStatusCode,
} from "../../utils/constant.js";
import {
    activateAgentAccount,
    deactivateAgentAccount,
    findWithdrawalRequestById,
} from "../service/admin.js";

const AdminController = {
    async getDashboardAnalytics(req, res, next) {
        try {
            const [
                totalNumberOfAgents,
                activeReferralCodes,
                totalPaidToAgents,
                totalLatestWithdrawalRequest,
                totalOrdersCompleted,
            ] = await Promise.all([
                adminService.totalNumberOfAgents(),
                adminService.activeReferralCodes(),
                adminService.totalPaidToAgents(),
                adminService.totalLatestWithdrawalRequest(),
                adminService.totalOrdersCompleted(),
            ]);

            res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                totalNumberOfAgents,
                activeReferralCodes,
                totalPaidToAgents,
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

    async getMultipleAgent(req, res, next) {
        try {
            const { page = 1, limit = 100, search = "" } = req.query;

            const agents = await adminService.getAgentsWithPageLimitSearch(
                page,
                limit,
                search
            );
            const totalAgents = await adminService.totalNumberOfAgents();
            const totalPages = Math.ceil(totalAgents / limit);

            return res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                agents,
                rowCount: totalAgents,
                totalPages,
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

    async getOneAgent(req, res, next) {
        try {
            const { agentID } = req.params;

            const agent = await adminService.getAgentDetailsById(agentID);
            if (!agent) {
                return next(
                    createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
                        code: ErrorCodes.RESOURCE_NOT_FOUND,
                        message: "Agent with this ID not found!",
                    })
                );
            }

            res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                success: true,
                agent,
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

    async assignReferralCode(req, res, next) {
        try {
            const { agentID } = req.params;
            const { quantity } = req.body;

            const agent = await adminService.getAgentById(agentID);
            if (!agent) {
                return next(
                    createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
                        code: ErrorCodes.RESOURCE_NOT_FOUND,
                        message: "Agent not found!",
                    })
                );
            }

            await adminService.assignReferralCodeToAgent(agentID, quantity);

            return res.status(SuccessStatusCode.RESOURCE_CREATED).json({
                success: true,
                message: "Referral codes created successfully",
            });
        } catch (error) {
            logger.error(
                `Failed to allot refer code: ${error.message}, Error stack: ${error.stack}`
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
            const { remarks = null } = req.body;

            const withdrawalRequest = await findWithdrawalRequestById(
                withdrawalID
            );

            if (withdrawalRequest && withdrawalRequest.status === "pending") {
                const message = await adminService.processWithdrawalRequest(
                    processType,
                    remarks,
                    withdrawalRequest
                );

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

    async agentAccountStatusChange(req, res, next) {
        try {
            const { accountStatus, agentID } = req.params;

            if (accountStatus === "deactivate") {
                await deactivateAgentAccount(agentID);
            } else if (accountStatus === "activate") {
                await activateAgentAccount(agentID);
            } else {
                next(
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
