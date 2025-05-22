import mongoose from "mongoose";
import createHttpError from "http-errors";

import AgentModel from "../../db/models/agent.js";
import generateReferralCode from "../../utils/generateReferralCode.js";
import {
    ErrorStatusCode,
    ErrorCodes,
    SuccessStatusCode,
} from "../../utils/constant.js";
import NotificationTemplate from "../../utils/notificationTemplate.js";
import logger from "../../logging/index.js";
import {
    activateAgentAccount,
    approvedWithdrawalAmountUpdate,
    approvedWithdrawalRequest,
    deactivateAgentAccount,
    findAgentById,
    findAgentByIdWithLean,
    findWithdrawalRequestById,
    getAgentsForDataTable,
    insertReferralCodesToAgent,
    rejectedWithdrawalAmountUpdate,
    rejectedWithdrawalRequest,
    updateAgentReferralAndNotification,
} from "../service/admin.js";
import { createNotification } from "../service/notification.js";
import ReferralModel from "../../db/models/referral.js";
import NotificationModel from "../../db/models/notification.js";

const AdminController = {
    async getAgents(req, res, next) {
        try {
            const { page = 1, limit = 100, search = "" } = req.query;

            const query = search
                ? { name: { $regex: search, $options: "i" } } // adjust based on your schema
                : {};

            const sortByUpdateAt = { updatedAt: -1 };

            const agents = await getAgentsForDataTable({
                query,
                sortByUpdateAt,
                offset: (page - 1) * Number(limit),
                limit: Number(limit),
            });

            agents.forEach((agent) => {
                agent.totalReferrals = agent.referral.active.length;
                agent.totalOrders = agent.referral.used.length;

                delete agent.referral;
            });

            const rowCount = await AgentModel.countDocuments(query);

            const totalPages = Math.ceil(rowCount / limit);

            return res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                agents,
                rowCount,
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

    async getAgentById(req, res, next) {
        try {
            const { agentId } = req.params;

            const agent = await findAgentByIdWithLean(agentId);
            if (!agent) {
                return next(
                    createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
                        code: ErrorCodes.RESOURCE_NOT_FOUND,
                        message: "Agent with this not found!",
                    })
                );
            }

            res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                success: true,
                agent,
            });
        } catch (error) {
            console.error("Error in finding agent by id:", error.message);

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
            const { agentId } = req.params;
            const { quantity } = req.body;

            const agent = await AgentModel.findById(agentId);
            if (!agent) {
                return next(
                    createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
                        code: ErrorCodes.RESOURCE_NOT_FOUND,
                        message: "Agent not found with this id!",
                    })
                );
            }

            // Create referral codes
            // const referralList = Array.from(
            //     { length: parseInt(quantity) },
            //     () => ({
            //         referralCode: generateReferralCode(),
            //         agentId: agent._id,
            //     })
            // );

            const refercode = generateReferralCode();

            const newReferralCode = await ReferralModel.insertOne({
                referralCode: refercode,
                agentId: agent._id,
            });

            // const idReferralCodesLists = referralCodeLists.map(
            //     (referral) => referral._id
            // );

            const newNotification = await NotificationModel.insertOne({
                agentId,
                message: NotificationTemplate.REFERRAL_CODE_ALLOTED(quantity),
                type: "REFERRAL_CODE_ALLOTED",
            });

            await AgentModel.findOneAndUpdate(
                { _id: agentId },
                {
                    $push: {
                        "referral.active": newReferralCode._id,
                        notifications: newNotification._id,
                    },
                }
            );

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
    // async assignReferralCode(req, res, next) {
    //     const session = await mongoose.startSession();
    //     session.startTransaction();

    //     try {
    //         const { agentId } = req.params;
    //         const { quantity } = req.body;

    //         const agent = await findAgentById(agentId);
    //         if (!agent) {
    //             await session.abortTransaction();
    //             session.endSession();

    //             return next(
    //                 createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
    //                     code: ErrorCodes.RESOURCE_NOT_FOUND,
    //                     message: "Agent not found with this id!",
    //                 })
    //             );
    //         }

    //         // Create referral codes
    //         const referralList = Array.from(
    //             { length: parseInt(quantity) },
    //             () => ({
    //                 referralCode: generateReferralCode(),
    //                 agentId: agent._id,
    //             })
    //         );

    //         const insertedReferralCodes = await insertReferralCodesToAgent(
    //             referralList,
    //             session
    //         );

    //         const referralIdFromInsertedReferralCodes =
    //             insertedReferralCodes.map((referral) => referral._id);

    //         const assignReferralCodeNotifcation = await createNotification({
    //             agentId: agent._id,
    //             message: NotificationTemplate.REFERRAL_CODE_ALLOTED(quantity),
    //             type: "REFERRAL_CODE_ALLOTED",
    //             session,
    //         });

    //         await updateAgentReferralAndNotification({
    //             agentId,
    //             referralIdFromInsertedReferralCodes,
    //             assignReferralCodeNotifcation,
    //             session,
    //         });

    //         await session.commitTransaction();
    //         session.endSession();

    //         return res.status(SuccessStatusCode.RESOURCE_CREATED).json({
    //             success: true,
    //             message: "Referral codes created successfully",
    //         });
    //     } catch (error) {
    //         logger.error(
    //             `Failed to allot refer code: ${error.message}, Error stack: ${error.stack}`
    //         );

    //         await session.abortTransaction();
    //         session.endSession();

    //         return next(
    //             createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
    //                 code: ErrorCodes.SERVER_DATABASE_ERROR,
    //                 message: "Internal Server Error",
    //             })
    //         );
    //     }
    // },

    async processWithdrawalRequest(req, res, next) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { processType, withdrawalId } = req.params;
            const { remarks = null } = req.body;

            const withdrawalRequest = await findWithdrawalRequestById(
                withdrawalId
            );

            if (withdrawalRequest && withdrawalRequest.status === "pending") {
                if (processType === "approved") {
                    await approvedWithdrawalRequest(withdrawalId, session);

                    await approvedWithdrawalAmountUpdate(
                        withdrawalRequest.agentId,
                        withdrawalRequest.amount,
                        session
                    );

                    return res
                        .status(SuccessStatusCode.OPERATION_SUCCESSFUL)
                        .json({
                            success: true,
                            message:
                                "Withdrawal Request Approved Successfully!",
                        });
                } else if (processType === "rejected") {
                    await rejectedWithdrawalRequest(
                        withdrawalId,
                        remarks,
                        session
                    );

                    await rejectedWithdrawalAmountUpdate(
                        withdrawalRequest.agentId,
                        withdrawalRequest.amount,
                        session
                    );

                    return res
                        .status(SuccessStatusCode.OPERATION_SUCCESSFUL)
                        .json({
                            success: true,
                            message:
                                "Withdrawal Request Rejected Successfully!",
                        });
                } else {
                    await session.commitTransaction();
                    session.endSession();

                    next(
                        createHttpError(
                            ErrorStatusCode.VALIDATION_INVALID_FORMAT,
                            {
                                code: ErrorCodes.VALIDATION_INVALID_FORMAT,
                                message: "Invalid format field",
                            }
                        )
                    );
                }
            }

            await session.commitTransaction();
            session.endSession();

            return res.status(OPERATION_SUCCESSFUL).status({
                success: true,
                message: "Withdrawal Request is Already Approved or Not Exits!",
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

    async agentAccountStatusChange(req, res, next) {
        try {
            const { accountStatus, agentId } = req.params;

            if (accountStatus === "deactivate") {
                await deactivateAgentAccount(agentId);
            } else if (accountStatus === "activate") {
                await activateAgentAccount(agentId);
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
