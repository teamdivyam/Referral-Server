import mongoose from "mongoose";
import { CronJob } from "cron";

import AgentModel from "../src/db/models/agent.js";
import ReferralModel from "../src/db/models/referral.js";
import OrderModel from "../src/db/models/order.js";
import NotificationModel from "../src/db/models/notification.js";
import NotificationTemplate from "../src/utils/notificationTemplate.js";

(async () => {
  try {
    const db = await mongoose.connect("mongodb://localhost:27017/development-referral-program");
    db.connection.db.admin().command({
      setParameter: 1,
      maxTransactionLockRequestTimeoutMillis: 3000
    });
    console.log("Successfully connect to database ✅✅");    
  } catch (error) {
    console.log("Error in connecting to database:", error.message);
  }
})();

const orderStatusTypeRejected = ["Cancelled", "Refunded"];
const orderStatusTypeCompleted = ["Completed"];

const job = new CronJob(
  "0 * * * * *", // Runs every minutes
  async function () {
    console.log("Cron job started....");

    try {
      // Retreive referral that is pending and populate order to check it is complete or not
      const pendingReferrals = await ReferralModel.find({
        status: "pending",
      }).populate("order", "orderStatus");

      for (const referral of pendingReferrals) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
          /**
           * Execute when order status is ["Cancelled", "Refunded"]
           * Step by Step
           * 0. Create notification for agent referral code refunded/cancelled notification
           * 1. Pull referral id from agent.referral.pending and Decrement agent pendingBalance with rewardAmount
           * 2. Push referral id in agent.referral.used
           */
          if (orderStatusTypeRejected.includes(referral.order.orderStatus)) {
            const notificationRefunded = await NotificationModel.insertOne({
              agentId: referral.agentId,
              message: NotificationTemplate.TRACK_REFERRAL_CODE.REFUNDED(
                referral.referralCode
              ),
              type: "REFERRAL_CODE_STATUS",
            });

            referral.status = "used";
            await referral.save();

            await AgentModel.findByIdAndUpdate(referral.agentId, {
              $pull: {
                "referral.pending": referral._id,
              },
              $inc: {
                "wallet.pendingBalance": -referral.rewardAmount,
              },
            });
            await AgentModel.findByIdAndUpdate(referral.agentId, {
              $push: {
                "referral.used": referral._id,
                notifications: notificationRefunded._id,
              },
            });
          }

          /**
           * Execute when order status is ["Completed"]
           * Step by Step
           * 0. Create notification for agent referral code has been used
           * 1. Create notification for agent that reward amount now added to balance.
           * 1. Pull referral id from agent.referral.pending and Decrement agent pendingBalance with rewardAmount
           * 2. Push referral id in agent.referral.used
           */
          if (orderStatusTypeCompleted.includes(referral.order.orderStatus)) {
            const notificationReferralUsed = await NotificationModel.insertOne({
              agentId: referral.agentId,
              message: NotificationTemplate.TRACK_REFERRAL_CODE.USED(
                referral.referralCode
              ),
              type: "REFERRAL_CODE_STATUS",
            });
            const notificationAmountDeposited = await NotificationModel.insertOne({
              agentId: referral.agentId,
              message: NotificationTemplate.WALLET.DEPOSITED(
                referral.rewardAmount
              ),
              type: "WITHDRAWAL",
            });

            referral.status = "used";
            await referral.save();

            await AgentModel.findByIdAndUpdate(referral.agentId, {
              $pull: {
                "referral.pending": referral._id,
              },
              $inc: {
                "wallet.balance": referral.rewardAmount,
                "wallet.pendingBalance": -referral.rewardAmount,
              },
            });

            await AgentModel.findByIdAndUpdate(referral.agentId, {
              $push: {
                "referral.used": referral._id,
                notifications: [notificationReferralUsed._id, notificationAmountDeposited._id],
              },
            });
          }

          await session.commitTransaction();
          await session.endSession();
        } catch (error) {
          console.log("Error in cron job:", error.message);

          session.abortTransaction(); // ❌ Abort transaction (rollback changes)
          session.endSession(); // End session
        }
      }
    } catch (error) {
      console.log("Error in execution:", error.message);
    }

    console.log("Cron job end....");
  },
  null,
  true,
  "Asia/Kolkata"
);
