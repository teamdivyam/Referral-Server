import AgentModel from "../../db/models/agent.js";
import ReferralModel from "../../db/models/referral.js";

export const latestReferrals = async (req, skip, limit) => {
  try {
    const agent = await ReferralModel.find({
      agentId: req.user._id,
      status: { $in: ["pending", "used"] },
    })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    

    return {
      referral : {
        latest: agent
      },
    }
  } catch (error) {
    throw error;
  }
};

export const countLatestReferrals = async (req) => {
  try {
    const total = await AgentModel.aggregate([
      { $match: { _id: req.user._id } },
      {
        $project: {
          count: { $size: { $ifNull: ["$referral.latest", []] } }, // if $referrals.latest is null, return empty array, else return "$referrals.latest" },
        },
      },
    ]);

    return total[0].count;
  } catch (error) {
    throw error;
  }
};

export const activeReferrals = async (req, SKIP, LIMIT) => {
  try {
    const agent = await AgentModel.findById(req.user._id)
      .select("-_id referral.active")
      .populate({
        path: "referral.active",
        select: "referralCode status createdAt rewardAmount",
        options: { limit: LIMIT, skip: SKIP, sort: { createdAt: -1 } },
      });

    return agent;
  } catch (error) {
    throw error;
  }
};

export const countActiveReferrals = async (req) => {
  try {
    const total = await AgentModel.aggregate([
      { $match: { _id: req.user._id } },
      {
        $project: {
          count: { $size: { $ifNull: ["$referral.active", []] } }, // if $referrals.latest is null, return empty array, else return "$referrals.latest" },
        },
      },
    ]);

    return total[0].count;
  } catch (error) {
    throw error;
  }
};

export const pendingReferrals = async (req, SKIP, LIMIT) => {
  try {
    const agent = await AgentModel.findById(req.user._id)
      .select("-_id referral.pending")
      .populate({
        path: "referral.pending",
        options: { limit: LIMIT, skip: SKIP, sort: { createdAt: -1 } },
      });

    return agent;
  } catch (error) {
    throw error;
  }
};

export const countPendingReferrals = async (req) => {
  try {
    const total = await AgentModel.aggregate([
      { $match: { _id: req.user._id } },
      {
        $project: {
          count: { $size: { $ifNull: ["$referral.pending", []] } },
        },
      },
    ]);

    return total[0].count;
  } catch (error) {
    throw error;
  }
};

export const usedReferrals = async (req, SKIP, LIMIT) => {
  try {
    const agent = await AgentModel.findById(req.user._id)
      .select("-_id referral.used")
      .populate({
        path: "referral.used",
        options: { limit: LIMIT, skip: SKIP, sort: { createdAt: -1 } },
      });
    return agent;
  } catch (error) {
    throw error;
  }
};

export const countUsedReferrals = async (req) => {
  try {
    const total = await AgentModel.aggregate([
      { $match: { _id: req.user._id } },
      {
        $project: {
          count: { $size: { $ifNull: ["$referral.used", []] } },
        },
      },
    ]);

    return total[0].count;
  } catch (error) {
    throw error;
  }
};
