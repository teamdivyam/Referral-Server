import createHttpError from "http-errors";
import AgentModel from "../../db/models/agent.js";
import {
  SuccessStatusCode,
  ErrorStatusCode,
  ErrorCodes,
  MINIMUM_WITHDRAWAL_AMOUNT
} from "../../utils/constant.js";
import WithdrawalModel from "../../db/models/withdrawal.js";
import mongoose from "mongoose";
import NotificationModel from "../../db/models/notification.js";
import NotificationTemplate from "../../utils/notificationTemplate.js";

const WalletController = {
  async getWithdrawalHistory(req, res, next) {
    try {
      const agent = await AgentModel.findById(req.user._id).populate(
        "wallet.withdrawalHistory"
      );

      res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
        withdrawalHistory: agent.wallet.withdrawalHistory,
      });
    } catch (error) {
      console.log(error);
      return next(
        createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
          code: ErrorCodes.SERVER_DATABASE_ERROR,
          message: "Internal Server Error",
        })
      );
    }
  },

  // GET: Get earning, pending commissions, total withdrawals
  async summary(req, res, next) {},

  // POST: Request a withdraw
  async requestWithdrawal(req, res, next) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { amount } = req.body;

      const agent = await AgentModel.findById(req.user._id);

      // Minium withdrawal amount check up
      if (agent.wallet.balance < MINIMUM_WITHDRAWAL_AMOUNT) {
        console.log("Request withdrawal amount should be equal or above minimum withdrawal amount");

        await session.abortTransaction();
        session.endSession();

        return next(
          createHttpError(ErrorStatusCode.INSUFFECIENT_BALANCE, {
            code: ErrorCodes.INSUFFECIENT_BALANCE,
            message: "Request withdrawal amount should be equal or above minimum withdrawal amount",
          })
        );
      }

      // Check balance
      if (agent.wallet.balance < parseInt(amount)) {
        console.log("Insufficient balance Error:");

        await session.abortTransaction();
        session.endSession();

        return next(
          createHttpError(ErrorStatusCode.INSUFFECIENT_BALANCE, {
            code: ErrorCodes.INSUFFECIENT_BALANCE,
            message: "Insufficient balance",
          })
        );
      }

      // Create withdrawal record
      const withdrawal = new WithdrawalModel({
        agentId: agent._id,
        amount,
        status: "pending",
      });

      const notification = new NotificationModel({
        agentId: agent._id,
        type: "WITHDRAWAL",
        message: NotificationTemplate.WALLET.WITHDRAWAL_REQUESTED(amount)
      });

      // Push to withdrawal history
      agent.wallet.withdrawalHistory.push(withdrawal._id);

      // Update agent's wallet
      agent.wallet.balance -= parseInt(withdrawal.amount);
      agent.wallet.pendingWithdrawalAmount += parseInt(withdrawal.amount);

      agent.notifications.push(notification._id);

      await agent.save();
      await withdrawal.save();
      await notification.save();

      await session.commitTransaction();
      session.endSession();

      res.status(SuccessStatusCode.RESOURCE_CREATED).json({
        success: true,
        message: "Withdrawal request created successfully",
      });
    } catch (error) {
      console.log("Error in request withdrawal:", error);

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

export default WalletController;
