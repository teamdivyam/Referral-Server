import mongoose from "mongoose";
import AgentModel from "../../db/models/agent.js";
import ReferralModel from "../../db/models/referral.js";
import WithdrawalModel from "../../db/models/withdrawal.js";
import generateReferralCodeList from "../../utils/generateReferralCode.js";
import NotificationTemplate from "../../utils/notificationTemplate.js";
import { createNotification } from "./notification.js";
import logger from "../../logging/index.js";
import ReferralUserModelV1 from "../../db/models/ReferralUserV1.js";
import ReferralWithdrawalModel from "../../db/models/ReferralWithdrawalV1.js";
import ReferralEventModel from "../../db/models/ReferralEventsV1.js";
import UserModel from "../../db/models/user.js";

const adminService = {
    getReferralUserWithPageLimitSearch: async (page, limit, search) => {
        try {
            const query = search
                ? { fullName: { $regex: search, $options: "i" } }
                : {};

            const sortByUpdate = { updatedAt: -1 };

            const referralUsers = await UserModel.find({
                "refer.isReferrer": true,
                ...query,
            })
                .populate({
                    path: "refer.referralId",
                    populate: [
                        {
                            path: "referralEvents",
                            model: "referralevent",
                        },
                        {
                            path: "wallet.withdrawals",
                            model: "referralwithdrawal",
                        },
                    ],
                })
                .sort(sortByUpdate)
                .skip(limit * (page - 1))
                .limit(limit)
                .lean();

            // Adding totalRefer and totalReferCompleted
            referralUsers.forEach((user) => {
                user.totalRefer = user.refer.referralId.referralEvents.length;
                user.totalReferCompleted =
                    user.refer.referralId.referralEvents.filter(
                        (event) => event.status === "completed"
                    ).length;
            });

            return referralUsers;
        } catch (error) {
            throw error;
        }
    },

    totalReferralUser: async (search) => {
        try {
            const query = search
                ? { name: { $regex: search, $options: "i" } }
                : {};

            const result = await ReferralUserModelV1.countDocuments(query);

            return result;
        } catch (error) {
            throw error;
        }
    },

    totalLatestWithdrawalRequest: async () => {
        try {
            const result = await ReferralWithdrawalModel.countDocuments({
                status: "pending",
            });

            return result;
        } catch (error) {
            throw error;
        }
    },

    totalPaidToReferralUser: async () => {
        try {
            const result = await ReferralWithdrawalModel.aggregate([
                { $match: { status: "completed" } },
                {
                    $group: {
                        _id: null,
                        totalPaid: { $sum: "$amount" },
                    },
                },
            ]);

            const totalPaid = result[0]?.totalPaid || 0;
            return totalPaid;
        } catch (error) {
            throw error;
        }
    },

    totalOrdersCompleted: async () => {
        try {
            const result = await ReferralEventModel.countDocuments({
                status: "completed",
            });

            return result;
        } catch (error) {
            throw error;
        }
    },

    getReferralUserById: async (referralUserID) => {
        try {
            const referralUser = await ReferralUserModelV1.findById(
                referralUserID
            ).populate("user wallet.withdrawals");

            return referralUser;
        } catch (error) {
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
                await ReferralWithdrawalModel.findByIdAndUpdate(
                    withdrawalRequest._id,
                    {
                        $set: { status: "approved" },
                    },
                    { session }
                );
                await ReferralUserModelV1.findByIdAndUpdate(
                    withdrawalRequest.referralUserId,
                    {
                        $inc: {
                            "wallet.pendingWithdrawal":
                                -withdrawalRequest.amount,
                            "wallet.totalEarning":
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
        const withdrawalRequest = await ReferralUserModelV1.findById(
            withdrawalId
        );

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
