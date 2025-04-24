import mongoose from "mongoose";
import { CronJob } from "cron";
import ReferralModel from "../src/db/models/referral.js";
import AgentModel from "../src/db/models/agent.js";
import OrderModel from "../src/db/models/order.js";
import NotificationModel from "../src/db/models/notification.js";
import NotificationTemplate from "../src/utils/notificationTemplate.js";

mongoose
  .connect("mongodb://localhost:27017/development-referral-program")
  .then((db) => {
    console.log("Connected to MongoDB");
    db.connection.db.admin().command({
      setParameter: 1,
      maxTransactionLockRequestTimeoutMillis: 3000,
    });
  })
  .catch((err) => console.error("MongoDB connection error:", err));

const job = new CronJob(
  "0 * * * * *", // Runs every minutes
  async function () {
    console.log("Cron job started...");

    try {
      // Retreive referral that is pending and populate order to check it is complete or not
      const pendingReferrals = await ReferralModel.find({
        status: "pending",
      }).populate("order", "orderStatus");

      for (const referral of pendingReferrals) {
        const session = await mongoose.startSession();
        session.startTransaction();

        console.log(referral);

        try {
          // Check if order is refunded
          if (referral.order.orderStatus === "Refunded") {
            const notification = new NotificationModel({
              agentId: referral.agentId,
              message: NotificationTemplate.TRACK_REFERRAL_CODE.REFUNDED(referral.referralCode),
              type: "REFERRAL_CODE_STATUS",
            });

            referral.status = "used";

            await AgentModel.findByIdAndUpdate(referral.agentId, {
              $pull: {
                "referral.pending": referral._id,
              },
            });

            await AgentModel.findByIdAndUpdate(referral.agentId, {
              $push: {
                "referral.used": referral._id,
                notifications: notification._id
              },
              $inc: {
                "wallet.pendingBalance": -referral.rewardAmount,
              },
            });

            await notification.save();
            await referral.save();

          }
          // Check if order is completed
          if (referral.order.orderStatus === "Completed") {
            const notification = new NotificationModel({
              agentId: referral.agentId,
              message: NotificationTemplate.TRACK_REFERRAL_CODE.USED(
                referral.referralCode
              ),
              type: "REFERRAL_CODE_STATUS",
            });

            const notification1 = new NotificationModel({
              agentId: referral.agentId,
              message: NotificationTemplate.WALLET.DEPOSITED(
                referral.rewardAmount
              ),
              type: "WITHDRAWAL",
            });

            await ReferralModel.updateOne(
              { _id: referral._id },
              { status: "used" }
            );
            await AgentModel.updateOne(
              { _id: referral.agentId },
              {
                $pull: {
                  "referral.pending": referral._id,
                },
              }
            );
            await AgentModel.updateOne(
              { _id: referral.agentId },
              {
                $push: {
                  "referral.used": referral._id,
                  notifications: [notification._id, notification1._id],
                },
                $inc: {
                  "wallet.balance": referral.rewardAmount,
                  "wallet.pendingBalance": -referral.rewardAmount,
                },
              }
            );
            await notification.save();
            await notification1.save();
          }

          await session.commitTransaction();
          await session.endSession();
        } catch (error) {
          console.log("Error in cron job:", error);

          session.abortTransaction(); // ❌ Abort transaction (rollback changes)
          session.endSession(); // End session
        }
      }
    } catch (error) {
      console.log("Error in database:", error);
    }

    console.log("Cron job end...");
  },
  null,
  true,
  "Asia/Kolkata"
);
