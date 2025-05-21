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

export const withdrawalHistoryService = async (agentId) => {
    try {
        const agent = await AgentModel.findById(agentId).populate(
            "wallet.withdrawalHistory"
        );

        return agent.wallet.withdrawalHistory;
    } catch (error) {
        throw error;
    }
};
