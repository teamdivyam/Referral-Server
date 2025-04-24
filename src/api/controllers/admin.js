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

const LIMIT = 50;

const AdminController = {
  // 50 agents per page
  async getAgents(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;

      const SKIP = (page - 1) * LIMIT;

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

      const totalAgents = await AgentModel.countDocuments();
      const totalPages = Math.ceil(totalAgents / LIMIT);

      const agentsWithCount = agents.map((agent, index) => ({
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
        agents: agentsWithCount,
        page,
        totalAgents,
        totalPages,
      });
    } catch (error) {
      console.log("Error in getting agents:", error);

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

      const agent = await AgentModel.findById(agentId)
        .select(
          `name email phoneNumber wallet.totalEarningAmount 
          wallet.totalWithdrawalAmount wallet.currentWithdrawalAmount 
          wallet.pendingBalance referral.active referral.used createdAt`
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
      console.log("Error in retreiving agent using id:", error);

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
      const regex = new RegExp(query, "i"); // case-insensitive

      const agents = await AgentModel.find({ name: { $regex: regex } })
        .select(
          `name email phoneNumber wallet.totalEarningAmount 
        wallet.totalWithdrawalAmount wallet.currentWithdrawalAmount 
        wallet.pendingBalance referral.active referral.used createdAt`
        )
        .limit(LIMIT)
        .lean();

      const total = await AgentModel.countDocuments({
        name: { $regex: regex },
      });

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

      res.json({
        agents: agentsWithCount,
        count: total,
      });
    } catch (error) {
      console.log("Error in retreiving agent using search:", error);

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
      console.log("Error in approved withdraw request:", error);

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
      console.log("Error in rejected withdraw request:", error);

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
      const referralList = Array.from({ length: parseInt(quantity) }, () => ({
        referralCode: generateReferralCode(),
        agentId: agent._id,
        rewardAmount,
      }));

      // Insert referrals
      const createdReferrals = await ReferralModel.insertMany(referralList, {
        session,
      });

      const referralIds = createdReferrals.map((referral) => referral._id);

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
      console.error("Error allotting referral codes:", error);

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
