import AgentModel from "../../db/models/agent.js";

export const getAgentsService = async (SKIP, LIMIT) => {
    try {
        const agents = await AgentModel.find()
            .select(
                `name email phoneNumber wallet.totalEarningAmount 
                wallet.totalWithdrawalAmount wallet.currentWithdrawalAmount 
                wallet.pendingBalance referral.active referral.used createdAt`
            )
            .skip(SKIP)
            .limit(LIMIT)
            .sort({ createdAt: -1 })
            .lean();
        return agents;
    } catch (error) {
        throw error;
    }
};

export const totalAgentsService = async () => {
    try {
        const count = await AgentModel.countDocuments();

        return count;
    } catch (error) {
        throw error;
    }
};

export const findAgentUsingIdService = async (agentId) => {
    try {
        const agent = await AgentModel.findById(agentId)
            .select(
                `name email phoneNumber wallet.totalEarningAmount 
                wallet.totalEarningAmount wallet.pendingWithdrawalAmount 
                wallet.balance wallet.pendingBalance referral.active referral.pending referral.used createdAt`
            )
            .populate({
                path: "referral.used",
                select: "-_id referralCode userId status order rewardAmount",
            })
            .populate({
                path: "wallet.withdrawalHistory",
                select: "-_id amount status requestedAt",
            })
            .lean();

        return agent;
    } catch (error) {
        throw error;
    }
};

export const findAgentUsingSearchService = async (query) => {
    try {
        const regex = new RegExp(query, "i"); // case-insensitive

        const agents = await AgentModel.find({ name: { $regex: regex } })
            .select(
                `name email phoneNumber wallet.totalEarningAmount 
                wallet.totalWithdrawalAmount wallet.currentWithdrawalAmount 
                wallet.pendingBalance referral.active referral.used createdAt`
            )
            .limit(LIMIT)
            .lean();

        return agents;
    } catch (error) {
        throw error;
    }
};

export const totalAgentUsingSearchService = async (query) => {
    try {
        const regex = new RegExp(query, "i"); // case-insensitive
        const total = await AgentModel.countDocuments({
            name: { $regex: regex },
        });

        return total;
    } catch (error) {
        throw error;
    }
};

const agentService = {
    updateProfile: async ({
        agentID,
        name,
        phoneNumber,
        addressLine1,
        addressLine2,
        city,
        state,
    }) => {
        try {
            await AgentModel.updateOne(
                { _id: agentID },
                {
                    $set: {
                        name,
                        phoneNumber,
                        address: { addressLine1, addressLine2, city, state },
                        "userProfileCompleteStatus.profile": true,
                    },
                }
            );
        } catch (error) {
            throw error;
        }
    },

    addBankAccount: async ({
        agentID,
        bankName,
        accountHolderName,
        accountNumber,
        ifscCode,
    }) => {
        try {
            await AgentModel.updateOne(
                { _id: agentID },
                {
                    $push: {
                        bankAccounts: {
                            bankName,
                            accountHolderName,
                            accountNumber,
                            ifscCode,
                        },
                    },
                    $set: {
                        "userProfileCompleteStatus.bank": true,
                    },
                },
                { session }
            );
        } catch (error) {
            throw error;
        }
    },

    setBankAccountPrimary: async ({ agentID, bankID }) => {
        try {
            const agent = await AgentModel.findById(agentID);

            agent.bankAccounts.forEach((bank) => {
                bank.isPrimary = bank._id.equals(bankID);
            });

            await agent.save();
        } catch (error) {
            throw error;
        }
    },

    withdrawalHistory: async (agentID) => {
        try {
            const agent = await AgentModel.findById(agentID).populate(
                "wallet.withdrawalHistory"
            );

            return agent.wallet.withdrawalHistory;
        } catch (error) {
            throw error;
        }
    },
};

export default agentService;
