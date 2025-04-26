import AgentModel from "../../db/models/agent.js";
import ReferralModel from "../../db/models/referral.js";
import generateReferralCode from "../../utils/generateReferralCode.js";
import {
  SuccessStatusCode,
  ErrorStatusCode,
  ErrorCodes,
} from "../../utils/constant.js";
import createHttpError from "http-errors";
import mongoose from "mongoose";
import NotificationModel from "../../db/models/notification.js";
import {
  activeReferrals,
  countLatestReferrals,
  countActiveReferrals,
  countPendingReferrals,
  countUsedReferrals,
  pendingReferrals,
  usedReferrals,
  latestReferrals,
} from "../service/referral.js";
import logger from "../../config/logger.js";

const ReferralController = {
  // 20 referral per page
  async getAgentReferrals(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const page = parseInt(req.query.page) || 1;
      const status = req.query["refer-code-status"] || "latest";
      const skip = (page - 1) * limit;

      let agent;
      let total;

      switch (status) {
        case "latest":
          agent = await latestReferrals(req, skip, limit);
          total = await countLatestReferrals(req);
          break;

        case "active":
          agent = await activeReferrals(req, skip, limit);
          total = await countActiveReferrals(req);
          break;

        case "pending":
          agent = await pendingReferrals(req, skip, limit);
          total = await countPendingReferrals(req);
          break;

        case "used":
          agent = await usedReferrals(req, skip, limit);
          total = await countUsedReferrals(req);
          break;
      }

      return res.status(SuccessStatusCode.RESOURCE_CREATED).json({
        agent,
        total
      });

    } catch (error) {
      logger.error(`Failed to get agent referrals: ${error.message}, Error stack: ${error.stack}`);

      return next(
        createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
          code: ErrorCodes.SERVER_DATABASE_ERROR,
          message: "Internal Server Error",
        })
      );
    }
  },

  /**
   *
   * @function changeReferralStatusPending
   * @description
   * - Change referral status from active to pending
   * - Remove referral from active state
   * - Add referral to pending state
   * - Update agent pending balance
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   * @return {Response}
   */
  async changeReferralStatusPending(req, res, next) {
    // Start mongoose transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { referralCode, userId, order } = req.body;

      const referral = await ReferralModel.findOne({ referralCode });

      // If referral code is not exists, return error
      if (!referral) {
        await session.abortTransaction(); // ❌ Abort transaction (rollback changes)
        session.endSession(); // End session

        return next(
          createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
            code: ErrorCodes.RESOURCE_NOT_FOUND,
            message: "Referral not found",
          })
        );
      }

      // If referral code is not in active state, return error
      if (referral.status !== "active") {
        await session.abortTransaction(); // ❌ Abort transaction (rollback changes)
        session.endSession(); // End session

        return next(
          createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
            code: ErrorCodes.RESOURCE_NOT_FOUND,
            message: "Referral not found",
          })
        );
      }

      // Create notification
      const notification = new NotificationModel({
        agentId: referral.agentId,
        message: `Referral code ${referralCode} is now pending.`,
        type: "REFERRAL_CODE_STATUS",
      });

      /**
       * Update referral
       * 1. Change status to pending and add userId and order
       * 2. Remove referral from agent's active referrals
       * 3. Add referral to agent's pending referrals
       * 4. Update agent's pending balance
       */
      await ReferralModel.updateOne(
        { _id: referral._id },
        { $set: { status: "pending", userId, order } },
        { session }
      );
      await AgentModel.updateOne(
        { _id: referral.agentId },
        {
          $pull: { "referral.active": referral._id },
        },
        { session }
      );
      await AgentModel.updateOne(
        { _id: referral.agentId },
        {
          $push: {
            "referral.pending": referral._id,
            notifications: notification,
          },
          $inc: { "wallet.pendingBalance": referral.rewardAmount },
        },
        { session }
      );

      await notification.save({ session });

      await session.commitTransaction(); // ✅ Commit transaction (save changes)
      session.endSession();

      return res.status(SuccessStatusCode.RESOURCE_UPDATED).json({
        success: true,
        message: "Referral status updated successfully",
      });
    } catch (error) {
      logger.error(`Failed to change referral status: ${error.message}, Error stack: ${error.stack}`);

      await session.abortTransaction(); // ❌ Abort transaction (rollback changes)
      session.endSession(); // End session

      return next(
        createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
          code: ErrorCodes.SERVER_DATABASE_ERROR,
          message: "Internal Server Error",
        })
      );
    }
  },

  // DELETE: Delete a referral
  async delete(req, res, next) {},
};

export default ReferralController;
