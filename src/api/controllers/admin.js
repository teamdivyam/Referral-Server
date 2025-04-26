import mongoose from "mongoose";
import createHttpError from "http-errors";

import ReferralModel from "../../db/models/referral.js";
import AgentModel from "../../db/models/agent.js";
import NotificationModel from "../../db/models/notification.js";
import generateReferralCode from "../../utils/generateReferralCode.js";
import {
    ErrorStatusCode,
    ErrorCodes,
    SuccessStatusCode,
} from "../../utils/constant.js";
import NotificationTemplate from "../../utils/notificationTemplate.js";
import WithdrawalModel from "../../db/models/withdrawal.js";
import logger from "../../config/logger.js";
import {
    getAgentsService,
    findAgentUsingIdService,
    findAgentUsingSearchService,
    totalAgentsService,
    totalAgentUsingSearchService,
} from "../service/agent.js";

const LIMIT = 50;

const AdminController = {
    // 50 agents per page
    async getAgents(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const SKIP = (page - 1) * LIMIT;

            const agents = await getAgentsService(SKIP, LIMIT);

            const totalAgents = await totalAgentsService();
            const totalPages = Math.ceil(totalAgents / LIMIT);

            const agentsWithReferralCount = agents.map((agent, index) => ({
                serialNo: (page - 1) * LIMIT + index + 1,
                agentId: agent._id,
                name: agent.name,
                email: agent.email,
                phoneNumber: agent.phoneNumber,
                earnings: agent.wallet.totalEarningAmount,
                withdrawal: agent.wallet.totalWithdrawalAmount,
                balance: agent.wallet.currentWithdrawalAmount,
                joinedOn: agent.createdAt,
                referral: {
                    active: agent.referral.active.length,
                    used: agent.referral.used.length,
                },
            }));

            return res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                agents: agentsWithReferralCount,
                page,
                totalAgents,
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

    async getAgentUsingId(req, res, next) {
        try {
            const { agentId } = req.params;

            const agent = await findAgentUsingIdService(agentId);

            return res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                agentId: agent._id,
                name: agent.name,
                email: agent.email,
                phoneNumber: agent.phoneNumber,
                earnings: agent.wallet.totalEarningAmount,
                withdrawal: agent.wallet.totalWithdrawalAmount,
                balance: agent.wallet.currentWithdrawalAmount,
                joinedOn: agent.createdAt,
                bankAccounts: agent.bankAccounts,
                address: agent.address,
                userProfileCompleteStatus: agent.userProfileCompleteStatus,
                referral: {
                    active: agent.referral.active,
                    used: agent.referral.used,
                },
            });
        } catch (error) {
            logger.error(
                `Error in getting agent using id: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    },

    async getAgentUsingSearch(req, res, next) {
        try {
            const query = req.query.query || "";

            const agents = await findAgentUsingSearchService(query);
            const total = await totalAgentUsingSearchService(query);

            const agentsWithCount = agents.map((agent) => ({
                agentId: agent._id,
                name: agent.name,
                email: agent.email,
                phoneNumber: agent.phoneNumber,
                earnings: agent.wallet.totalEarningAmount,
                withdrawal: agent.wallet.totalWithdrawalAmount,
                balance: agent.wallet.currentWithdrawalAmount,
                joinedOn: agent.createdAt,
                referral: {
                    active: agent.referral.active.length,
                    used: agent.referral.used.length,
                },
            }));

            res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                agents: agentsWithCount,
                count: total,
            });
        } catch (error) {
            logger.error(
                `Error in retreiving agent using search: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    },

    async approvedWithdrawRequest(req, res, next) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { withdrawalId } = req.body;

            const withdrawal = await WithdrawalModel.findById(withdrawalId);

            /**
             * If withdrawal is already approved,
             * Send error
             */
            if (withdrawal.status === "approved") {
                await session.commitTransaction();
                session.endSession();

                return next(
                    createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
                        code: ErrorCodes.RESOURCE_NOT_FOUND,
                        message: "Withdrawal already approved.",
                    })
                );
            }

            const agent = await AgentModel.findById(withdrawal.agentId);

            /**
             * Mark withdrawal status approved and Update agent wallet
             * 1. decrement withdrawal amount from agent pending withdrawal amount
             * 2. increment withdrawal amount to agent total earning amount
             */
            withdrawal.status = "approved";
            agent.wallet.pendingWithdrawalAmount -= withdrawal.amount;
            agent.wallet.totalEarningAmount += withdrawal.amount;

            await withdrawal.save();
            await agent.save();

            await session.commitTransaction();
            session.endSession();

            return res.status(SuccessStatusCode.RESOURCE_UPDATED).json({
                success: true,
                message: "Withdraw of agent has been approved.",
            });
        } catch (error) {
            logger.error(
                `Error in approved withdraw request: ${error.message}, Error stack: ${error.stack}`
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

    async rejectWithdrawRequest(req, res, next) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { withdrawalId, remarks } = req.body;

            const withdrawal = await WithdrawalModel.findById(withdrawalId);
            const agent = await AgentModel.findById(withdrawal.agentId);

            withdrawal.status = "rejected";
            withdrawal.remarks = remarks;

            agent.wallet.totalEarningAmount -= withdrawal.amount;
            agent.wallet.currentWithdrawalAmount -= withdrawal.amount;

            await withdrawal.save();
            await agent.save();

            await session.commitTransaction();
            session.endSession();

            return res.status(SuccessStatusCode.RESOURCE_UPDATED).json({
                success: true,
                message: "Withdraw of agent has been rejected.",
            });
        } catch (error) {
            logger.error(
                `Error in reject withdraw request: ${error.message}, Error stack: ${error.stack}`
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

    async allotReferCodes(req, res, next) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { agentId, quantity, rewardAmount } = req.body;

            const agent = await AgentModel.findById(agentId);
            if (!agent) {
                await session.abortTransaction();
                session.endSession();

                return next(
                    createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
                        code: ErrorCodes.RESOURCE_NOT_FOUND,
                        message: "User not found",
                    })
                );
            }

            // Create referral codes
            const referralList = Array.from(
                { length: parseInt(quantity) },
                () => ({
                    referralCode: generateReferralCode(),
                    agentId: agent._id,
                    rewardAmount,
                })
            );

            // Insert referrals
            const createdReferrals = await ReferralModel.insertMany(
                referralList,
                {
                    session,
                }
            );

            const referralIds = createdReferrals.map(
                (referral) => referral._id
            );

            // Create notification
            const notification = new NotificationModel({
                agentId: agent._id,
                message: NotificationTemplate.REFERRAL_CODE_ALLOTED(
                    createdReferrals.length
                ),
                type: "REFERRAL_CODE_ALLOTED",
            });

            await AgentModel.updateOne(
                { _id: agent._id },
                {
                    $push: {
                        "referral.active": { $each: referralIds },
                        notifications: notification._id,
                    },
                },
                { session }
            );

            await notification.save({ session });

            await session.commitTransaction();
            session.endSession();

            return res.status(SuccessStatusCode.RESOURCE_CREATED).json({
                success: true,
                message: "Referral codes created successfully",
            });
        } catch (error) {
            logger.error(
                `Failed to allot refer code: ${error.message}, Error stack: ${error.stack}`
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
};

export default AdminController;
