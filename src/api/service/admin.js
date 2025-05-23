import mongoose from "mongoose";
import AgentModel from "../../db/models/agent.js";
import ReferralModel from "../../db/models/referral.js";
import WithdrawalModel from "../../db/models/withdrawal.js";
import generateReferralCodeList from "../../utils/generateReferralCode.js";
import NotificationTemplate from "../../utils/notificationTemplate.js";
import { createNotification } from "./notification.js";
import logger from "../../logging/index.js";

const adminService = {
    getAgentsWithPageLimitSearch: async (page, limit, search) => {
        try {
            const query = search
                ? { name: { $regex: search, $options: "i" } }
                : {};

            const sortByUpdate = { updatedAt: -1 };

            const agents = await AgentModel.find(query)
                .select(
                    "_id name phoneNumber referral wallet updatedAt accountStatus"
                )
                .sort(sortByUpdate)
                .skip(limit * (page - 1))
                .limit(limit)
                .lean();

            agents.forEach((agent) => {
                agent.totalReferrals = agent.referral.active.length;
                agent.totalOrders = agent.referral.used.length;

                delete agent.referral;
            });

            return agents;
        } catch (error) {
            throw Error(error);
        }
    },

    totalNumberOfAgents: async (search) => {
        try {
            const query = search
                ? { name: { $regex: search, $options: "i" } }
                : {};

            const totalAgents = await AgentModel.countDocuments(query);

            return totalAgents;
        } catch (error) {
            throw Error(error);
        }
    },

    getAgentDetailsById: async (id) => {
        try {
            const agent = await AgentModel.findById(id)
                .populate(
                    "wallet.withdrawalHistory referral.active referral.pending referral.used"
                )
                .lean();

            return agent;
        } catch (error) {
            throw Error(error);
        }
    },

    getAgentById: async (id) => {
        try {
            const agent = await AgentModel.findById(id);
            return agent;
        } catch (error) {
            throw Error(error);
        }
    },

    assignReferralCodeToAgent: async (id, quantity) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Generate referral code and push it into array
            const referralCodeList = generateReferralCodeList(id, quantity);

            console.log(
                "Generate random list of referral code:",
                referralCodeList
            );

            // Insert generated referral code into referral collection
            const newReferralCodeList = await ReferralModel.insertMany(
                referralCodeList,
                { session }
            );

            console.log("New Referral Code List: ", newReferralCodeList);

            // Retreive new referral code Id
            const referralCodeIdList = newReferralCodeList.map(
                (referral) => referral._id
            );

            console.log("Referral Code Id List: ", referralCodeIdList);

            // Create new notification to agent that new referral code assigned
            const newNotification = await createNotification({
                agentId: id,
                message: NotificationTemplate.REFERRAL_CODE_ALLOTED(quantity),
                type: "REFERRAL_CODE_ALLOTED",
                session,
            });

            console.log("New notification:", newNotification);

            // Push new referral code Id and nofitication into agent.referral.active
            await AgentModel.findByIdAndUpdate(
                id,
                {
                    $push: {
                        "referral.active": { $each: referralCodeIdList },
                        notification: newNotification._id,
                    },
                },
                { session }
            );

            await session.commitTransaction();
            session.endSession();
        } catch (error) {
            await session.abortTransaction();
            session.endSession();

            logger.error(
                `Error in assignReferralCodeToAgent(): ${error.message}, Error stack: ${error.stack}`
            );

            throw error;
        }
    },

    processWithdrawalRequest: async (
        processType,
        remarks,
        withdrawalRequest
    ) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            if (processType === "approved") {
                await WithdrawalModel.findByIdAndUpdate(
                    withdrawalRequest._id,
                    {
                        $set: { status: "approved" },
                    },
                    { session }
                );
                await AgentModel.findByIdAndUpdate(
                    withdrawalRequest.agentId,
                    {
                        $inc: {
                            "wallet.pendingWithdrawalAmount":
                                -withdrawalRequest.amount,
                            "wallet.totalEarningAmount":
                                withdrawalRequest.amount,
                        },
                    },
                    { session }
                );

                await session.commitTransaction();
                session.endSession();

                return "Withdrawal request has been approved!";
            } else if (processType === "rejected") {
                await WithdrawalModel.findByIdAndUpdate(
                    withdrawalRequest._id,
                    {
                        $set: { status: "rejected", remarks },
                    },
                    { session }
                );
                await AgentModel.findByIdAndUpdate(
                    withdrawalRequest.agentId,
                    {
                        $inc: {
                            "wallet.pendingWithdrawalAmount":
                                -withdrawalRequest.amount,
                        },
                    },
                    { session }
                );

                await session.commitTransaction();
                session.endSession();

                return "Withdrawal request has been rejected!";
            }
        } catch (error) {
            await session.abortTransaction();
            session.endSession();

            logger.error("Error in processWithdrawalRequest():", error.message);

            throw error;
        }
    },
};

export default adminService;

export const findWithdrawalRequestById = async (withdrawalId) => {
    try {
        const withdrawalRequest = await WithdrawalModel.findById(withdrawalId);

        return withdrawalRequest;
    } catch (error) {
        throw Error(error);
    }
};

export const deactivateAgentAccount = async (agentId) => {
    try {
        await AgentModel.findByIdAndUpdate(agentId, {
            $set: {
                accountStatus: "deactivate",
            },
        });
    } catch (error) {
        throw Error(error);
    }
};

export const activateAgentAccount = async (agentId) => {
    try {
        await AgentModel.findByIdAndUpdate(agentId, {
            $set: {
                accountStatus: "activate",
            },
        });
    } catch (error) {
        throw Error(error);
    }
};
