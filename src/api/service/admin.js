import mongoose from "mongoose";
import logger from "../../logging/index.js";
import ReferralUserModelV1 from "../../db/models/ReferralUserV1.js";
import WithdrawalModel from "../../db/models/ReferralWithdrawalV1.js";
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
            const result = await WithdrawalModel.countDocuments({
                status: "pending",
            });

            return result;
        } catch (error) {
            throw error;
        }
    },

    totalPaidToReferralUser: async () => {
        try {
            const result = await WithdrawalModel.aggregate([
                { $match: { status: "approved" } },
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
            ).populate("user wallet.withdrawals referralEvents");

            return referralUser;
        } catch (error) {
            throw error;
        }
    },

    processWithdrawalRequest: async ({
        processType,
        transactionId,
        remarks,
        withdrawalRequest,
    }) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            if (processType === "approved") {
                await WithdrawalModel.findByIdAndUpdate(
                    withdrawalRequest._id,
                    {
                        $set: {
                            status: "approved",
                            remarks: remarks,
                            processedAt: new Date(),
                            transactionId: transactionId,
                        },
                    },
                    { session }
                );
                await ReferralUserModelV1.findByIdAndUpdate(
                    withdrawalRequest.referralUser,
                    {
                        $inc: {
                            "wallet.pendingWithdrawal":
                                -withdrawalRequest.amount,
                            "wallet.totalEarning": withdrawalRequest.amount,
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
                        $set: {
                            status: "rejected",
                            remarks: remarks,
                            processedAt: new Date(),
                        },
                    },
                    { session }
                );
                await ReferralUserModelV1.findByIdAndUpdate(
                    withdrawalRequest.referralUser,
                    {
                        $inc: {
                            "wallet.pendingWithdrawal":
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

    findWithdrawalUsingSearchTerm: async ({
        withdrawalStatus,
        page,
        search,
        fromDate,
        toDate,
        limit,
    }) => {
        try {
            const dateRange =
                withdrawalStatus === "pending"
                    ? { createdAt: { $gte: fromDate, $lt: toDate } }
                    : { processedAt: { $gte: fromDate, $lt: toDate } };
            const result = await WithdrawalModel.aggregate([
                {
                    $lookup: {
                        from: "users",
                        localField: "user",
                        foreignField: "_id",
                        as: "user",
                    },
                },
                {
                    $unwind: "$user",
                },
                {
                    $match: {
                        status: withdrawalStatus,
                        ...dateRange,
                        "user.fullName": { $regex: search, $options: "i" },
                    },
                },
                { $skip: limit * (page - 1) },
                { $limit: limit },
            ]);

            return result;
        } catch (error) {
            throw error;
        }
    },

    findWithdrawalCountUsingSearchTerm: async ({ withdrawalStatus, search }) => {
        try {
            const result = await WithdrawalModel.aggregate([
                {
                    $lookup: {
                        from: "users",
                        localField: "user",
                        foreignField: "_id",
                        as: "user",
                    },
                },
                {
                    $unwind: "$user",
                },
                {
                    $match: {
                        status: withdrawalStatus,
                        "user.fullName": { $regex: search, $options: "i" },
                    },
                },
                { $count: "total" },
            ]);

            return result[0]?.total || 0;
        } catch (error) {
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

export const deactivateAccount = async (referralUserID) => {
    try {
        const a = await ReferralUserModelV1.findByIdAndUpdate(referralUserID, {
            $set: {
                accountStatus: "deactive",
            },
        });

        console.log("a:", a);
    } catch (error) {
        throw Error(error);
    }
};

export const activateAccount = async (referralUserID) => {
    try {
        await ReferralUserModelV1.findByIdAndUpdate(referralUserID, {
            $set: {
                accountStatus: "active",
            },
        });
    } catch (error) {
        throw Error(error);
    }
};
