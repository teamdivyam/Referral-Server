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
                        },
                        {
                            path: "wallet.withdrawals",
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
                    withdrawalRequest.referral_user,
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

    findWithdrawalCountUsingSearchTerm: async ({
        withdrawalStatus,
        search,
    }) => {
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

    getReferral: async ({
        page,
        referralStatus,
        search,
        fromDate,
        toDate,
        searchIn,
        id,
        searchIdIn,
        LIMIT,
    }) => {
        try {
            const referralPipeline = [
                {
                    $lookup: {
                        from: "users",
                        localField: "referrer_user_id",
                        foreignField: "_id",
                        as: "referrer",
                    },
                },
                { $unwind: "$referrer" },
                {
                    $lookup: {
                        from: "users",
                        localField: "referee_user_id",
                        foreignField: "_id",
                        as: "referee",
                    },
                },
                { $unwind: "$referee" },
                {
                    $match: {
                        status: referralStatus,
                        createdAt: {
                            $gte: fromDate,
                            $lte: toDate,
                        },
                    },
                },
            ];

            if (search) {
                if (searchIn === "referrer") {
                    referralPipeline.push({
                        $match: {
                            $or: [
                                {
                                    "referrer.fullName": {
                                        $regex: search,
                                        $options: "i",
                                    },
                                },
                                {
                                    "referrer.email": {
                                        $regex: search,
                                        $options: "i",
                                    },
                                },
                                {
                                    "referrer.mobileNum": {
                                        $regex: search,
                                        $options: "i",
                                    },
                                },
                            ],
                        },
                    });
                } else if (searchIn === "referee") {
                    referralPipeline.push({
                        $match: {
                            $or: [
                                {
                                    "referee.fullName": {
                                        $regex: search,
                                        $options: "i",
                                    },
                                },
                                {
                                    "referee.email": {
                                        $regex: search,
                                        $options: "i",
                                    },
                                },
                                {
                                    "referee.mobileNum": {
                                        $regex: search,
                                        $options: "i",
                                    },
                                },
                            ],
                        },
                    });
                }
            }

            if (id) {
                if (searchIdIn === "referId") {
                    referralPipeline.push({
                        $match: {
                            ref_id: `REF-${id}`,
                        },
                    });
                } else if (searchIdIn === "orderId") {
                    referralPipeline.push({
                        $match: {
                            order: id,
                        },
                    });
                }
            }

            referralPipeline.push({
                $facet: {
                    referrals: [
                        { $sort: { createdAt: -1 } },
                        { $skip: LIMIT * (page - 1) },
                        { $limit: LIMIT },
                        {
                            $project: {
                                ref_id: 1,
                                status: 1,
                                amount: 1,
                                referral_code: 1,
                                createdAt: 1,
                                updatedAt: 1,
                                order: 1,
                                processed_at: 1,
                                "referrer._id": 1,
                                "referrer.fullName": 1,
                                "referrer.email": 1,
                                "referrer.mobileNum": 1,
                                "referee._id": 1,
                                "referee.fullName": 1,
                                "referee.email": 1,
                                "referee.mobileNum": 1,
                            },
                        },
                    ],
                    totalCount: [{ $count: "total" }],
                },
            });

            const referrals = await ReferralEventModel.aggregate(
                referralPipeline
            );

            return referrals;
        } catch (error) {
            throw error;
        }
    },

    getWithdrawal: async ({
        withdrawalStatus,
        page,
        search,
        fromDate,
        toDate,
        LIMIT,
    }) => {
        const withdrawalPipeline = [
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
            {
                $lookup: {
                    from: "referralusers",
                    localField: "referral_user",
                    foreignField: "_id",
                    as: "referralUser",
                },
            },
            { $unwind: "$referralUser" },
            {
                $match: {
                    status: withdrawalStatus,
                    createdAt: {
                        $gte: fromDate,
                        $lte: toDate,
                    },
                },
            },
        ];

        if (search) {
            withdrawalPipeline.push({
                $match: {
                    $or: [
                        {
                            "user.fullName": {
                                $regex: search,
                                $options: "i",
                            },
                        },
                        {
                            "user.email": {
                                $regex: search,
                                $options: "i",
                            },
                        },
                        {
                            "user.mobileNum": {
                                $regex: search,
                                $options: "i",
                            },
                        },
                    ],
                },
            });
        }

        withdrawalPipeline.push({
            $facet: {
                withdrawals: [
                    { $sort: { createdAt: -1 } },
                    { $skip: LIMIT * (page - 1) },
                    { $limit: LIMIT },
                    {
                        $project: {
                            withdrawal_id: 1,
                            amount: 1,
                            status: 1,
                            transaction_id: 1,
                            remarks: 1,
                            processed_at: 1,
                            createdAt: 1,
                            updatedAt: 1,
                            "bank.name": 1,
                            "bank.accountHolderName": 1,
                            "bank.accountNumber": 1,
                            "bank.codeIFSC": 1,
                            "user.fullName": 1,
                            "user.email": 1,
                            "user.mobileNum": 1,
                            "referralUser.wallet.balance": 1,
                            "referralUser.wallet.pendingBalance": 1,
                            "referralUser.wallet.totalEarning": 1,
                            "referralUser.wallet.pendingWithdrawal": 1,
                        },
                    },
                ],
                totalCount: [{ $count: "total" }],
            },
        });

        const withdrawals = await WithdrawalModel.aggregate(withdrawalPipeline);

        return withdrawals;
    },

    getReferralOverTime: async ({ fromDate, toDate }) => {
        let referralOverTimeData = [];
        const result = await ReferralEventModel.aggregate([
            {
                $match: {
                    createdAt: { $gte: fromDate, $lt: toDate },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$createdAt",
                        },
                    },
                    count: {
                        $sum: 1,
                    },
                },
            },
            {
                $sort: { _id: -1 },
            },
        ]);

        while (fromDate.getTime() < toDate.getTime()) {
            referralOverTimeData.push({
                day: fromDate.getDate(),
                refers: 0,
            });
            result.forEach((ref) => {
                const refDate = new Date(ref._id);

                if (fromDate.getTime() === refDate.getTime()) {
                    referralOverTimeData[
                        referralOverTimeData.length - 1
                    ].refers = ref.count;
                }
            });
            fromDate.setDate(fromDate.getDate() + 1);
        }

        return referralOverTimeData;
    },

    getMultipleReferralUsers: async ({
        page,
        pageSize,
        search,
        searchFor,
        sortBy,
        sortDir,
    }) => {
        try {
            const referralPipeline = [
                {
                    $lookup: {
                        from: "users",
                        localField: "user",
                        foreignField: "_id",
                        as: "user",
                    },
                },
                { $unwind: "$user" },
                {
                    $lookup: {
                        from: "referralevents",
                        localField: "referralEvents",
                        foreignField: "_id",
                        as: "referralEvents",
                    },
                },
                {
                    $unwind: {
                        path: "$referralEvents",
                        preserveNullAndEmptyArrays: true, // Preserve users with no referrals
                    },
                },
            ];

            if (search) {
                referralPipeline.push({
                    $match: {
                        $or: [
                            {
                                "user.fullName": {
                                    $regex: search,
                                    $options: "i",
                                },
                            },
                            {
                                "user.email": {
                                    $regex: search,
                                    $options: "i",
                                },
                            },
                            {
                                "user.mobileNum": {
                                    $regex: search,
                                    $options: "i",
                                },
                            },
                        ],
                    },
                });
            }

            referralPipeline.push({
                $facet: {
                    referralUsers: [
                        {
                            $group: {
                                _id: "$_id",
                                user: { $first: "$user" },
                                wallet: { $first: "$wallet" },
                                referralCode: { $first: "$referralCode" },
                                accountStatus: { $first: "$accountStatus" },
                                createdAt: { $first: "$createdAt" },
                                updatedAt: { $first: "$updatedAt" },
                                referralEvents: { $push: "$referralEvents" },
                            },
                        },
                        {
                            $addFields: {
                                referralStats: {
                                    pending: {
                                        $size: {
                                            $filter: {
                                                input: "$referralEvents",
                                                as: "event",
                                                cond: {
                                                    $eq: [
                                                        "$$event.status",
                                                        "pending",
                                                    ],
                                                },
                                            },
                                        },
                                    },
                                    completed: {
                                        $size: {
                                            $filter: {
                                                input: "$referralEvents",
                                                as: "event",
                                                cond: {
                                                    $eq: [
                                                        "$$event.status",
                                                        "completed",
                                                    ],
                                                },
                                            },
                                        },
                                    },
                                    rejected: {
                                        $size: {
                                            $filter: {
                                                input: "$referralEvents",
                                                as: "event",
                                                cond: {
                                                    $eq: [
                                                        "$$event.status",
                                                        "rejected",
                                                    ],
                                                },
                                            },
                                        },
                                    },
                                    total: { $size: "$referralEvents" },
                                },
                            },
                        },
                        {
                            $project: {
                                user: {
                                    fullName: "$user.fullName",
                                    email: "$user.email",
                                    mobileNum: "$user.mobileNum",
                                },
                                wallet: {
                                    balance: 1,
                                    pendingBalance: 1,
                                    pendingWithdrawal: 1,
                                    totalEarning: 1,
                                    accounts: 1,
                                },
                                referralCode: 1,
                                accountStatus: 1,
                                createdAt: 1,
                                updatedAt: 1,
                                referralStats: 1,
                            },
                        },
                        { $sort: { updatedAt: -1 } },
                        { $skip: pageSize * (page - 1) },
                        { $limit: pageSize },
                    ],
                    totalCount: [
                        { $group: { _id: "$_id" } }, // Group by user to get distinct count
                        { $count: "total" }, // Count the distinct users
                    ],
                },
            });

            const result = await ReferralUserModelV1.aggregate(
                referralPipeline
            );

            return result;
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
