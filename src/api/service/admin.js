import AgentModel from "../../db/models/agent.js";
import ReferralModel from "../../db/models/referral.js";
import WithdrawalModel from "../../db/models/withdrawal.js";

export const getAgentsForDataTable = async ({
    query,
    sortByUpdateAt,
    offset,
    limit,
}) => {
    try {
        const agents = await AgentModel.find(query)
            .select("_id name phoneNumber referral wallet updatedAt accountStatus")
            .sort(sortByUpdateAt)
            .skip(offset)
            .limit(limit)
            .lean();
        
        return agents
    } catch (error) {
        throw Error(error);
    }
}

export const findAgentByIdWithLean = async (agentId) => {
    try {
        const agent = await AgentModel.findById(agentId)
            .select(
                `name email phoneNumber address bankAccounts 
                referral wallet userProfileCompleteStatus accountStatus`
            )
            .populate(
                "referral.active referral.pending referral.used wallet.withdrawalHistory"
            )
            .lean();

        return agent;
    } catch (error) {
        throw Error(error);
    }
};

export const findAgentById = async (agentId) => {
    try {
        const agent = await AgentModel.findById(agentId);

        return agent;
    } catch (error) {
        throw Error(error);
    }
};

export const insertReferralCodesToAgent = async (referralCodeList, session) => {
    try {
        const insertedReferrals = await ReferralModel.insertMany(
            referralCodeList,
            { session }
        );

        return insertedReferrals;
    } catch (error) {
        throw Error(error);
    }
};

export const updateAgentReferralAndNotification = async ({
    agentId,
    referralIdFromInsertedReferralCodes,
    assignReferralCodeNotifcation,
    session,
}) => {
    try {
        await AgentModel.findByIdAndUpdate(
            agentId,
            {
                $push: {
                    "referral.active": {
                        $each: referralIdFromInsertedReferralCodes,
                    },
                    notifications: assignReferralCodeNotifcation._id,
                },
            },
            { session }
        );
    } catch (error) {
        throw Error(error);
    }
};

export const findWithdrawalRequestById = async (withdrawalId) => {
    try {
        const withdrawalRequest = await WithdrawalModel.findById(withdrawalId);

        return withdrawalRequest;
    } catch (error) {
        throw Error(error);
    }
};

export const approvedWithdrawalRequest = async (withdrawalId, session) => {
    try {
        await WithdrawalModel.findByIdAndUpdate(
            withdrawalId,
            {
                $set: { status: "approved" },
            },
            { session }
        );
    } catch (error) {
        throw Error(error);
    }
};

export const rejectedWithdrawalRequest = async (
    withdrawalId,
    remarks,
    session
) => {
    try {
        await WithdrawalModel.findByIdAndUpdate(
            withdrawalId,
            {
                $set: { status: "rejected", remarks },
            },
            { session }
        );
    } catch (error) {
        throw Error(error);
    }
};

export const approvedWithdrawalAmountUpdate = async (
    agentId,
    amount,
    session
) => {
    try {
        await AgentModel.findByIdAndUpdate(
            agentId,
            {
                $inc: {
                    "wallet.pendingWithdrawalAmount": -amount,
                    "wallet.totalEarningAmount": amount,
                },
            },
            { session }
        );
    } catch (error) {
        throw Error(error);
    }
};

export const rejectedWithdrawalAmountUpdate = async (
    agentId,
    amount,
    session
) => {
    try {
        await AgentModel.findByIdAndUpdate(
            agentId,
            {
                $inc: {
                    "wallet.pendingWithdrawalAmount": -amount,
                },
            },
            { session }
        );
    } catch (error) {
        throw Error(error);
    }
};

export const deactivateAgentAccount = async (agentId) => {
    try {
        await AgentModel.findByIdAndUpdate(agentId, {
            $set: {
                accountStatus: "deactivate"
            }
        })
    } catch (error) {
        throw Error(error);
    }
}

export const activateAgentAccount = async (agentId) => {
    try {
        await AgentModel.findByIdAndUpdate(agentId, {
            $set: {
                accountStatus: "activate"
            }
        })
    } catch (error) {
        throw Error(error);
    }
}
