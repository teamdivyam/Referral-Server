import cron from "node-cron";
import mongoose from "mongoose";

import ReferralEventModel from "../src/db/models/ReferralEventModel.js";
import ReferralUserModelV1 from "../src/db/models/ReferralUserModel.js";
import OrderModel from "../src/db/models/OrderModel.js";

let cronJob = null;
let lastExecutionTime = null;

const orderStatusType = {
    completed: ["Completed"],
    rejected: ["Cancelled", "Refunded"],
};

let pendingBalance = 100000;
let balance = 0;

const jobFunction = async () => {
    console.log("Running scheduled job...");
    lastExecutionTime = new Date();

    try {
        /**
         * Retreive referral events which has status 'pending'
         * and populate order to check order status
         */
        const pendingReferrals = await ReferralEventModel.find({
            status: "pending",
        }).populate({ path: "order", select: "orderStatus" });

        for (const referral of pendingReferrals) {
            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                const orderStatus = referral.order.orderStatus;

                if (orderStatusType.completed.includes(orderStatus)) {
                    referral.status = "completed";
                    referral.processed_at = new Date();

                    await ReferralUserModelV1.findByIdAndUpdate(
                        referral.referrer_id,
                        {
                            $inc: {
                                "wallet.pendingBalance": -referral.amount,
                                "wallet.balance": referral.amount,
                            },
                        }
                    );

                    await referral.save();
                }

                if (orderStatusType.rejected.includes(orderStatus)) {
                    referral.status = "cancelled";
                    referral.processed_at = new Date();

                    await ReferralUserModelV1.findByIdAndUpdate(
                        referral.referrer_id,
                        {
                            $inc: {
                                "wallet.pendingBalance": -referral.amount,
                            },
                        }
                    );

                    await referral.save();
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
};

export const referralScript = async (res, state) => {
    try {
        if (state === "start") {
            if (cronJob) {
                return res
                    .status(400)
                    .json({ message: "Cron job is already running" });
            }

            cronJob = cron.schedule("* * * * *", jobFunction, {
                scheduled: true,
                timezone: "UTC",
            });

            return res.json({ message: "Cron job started successfully" });
        } else if (state === "stop") {
            if (!cronJob) {
                return res
                    .status(400)
                    .json({ message: "No cron job is currently running" });
            }

            cronJob.stop();
            cronJob = null;
            return res.json({ message: "Cron job stopped successfully" });
        } else {
            return res.status(400).json({
                message: 'Invalid state parameter. Use "start" or "stop"',
            });
        }
    } catch (error) {
        throw error;
    }
};

export const cronJobStatus = async (res) => {
    return res.json({
        isRunning: cronJob !== null,
        lastExecution: lastExecutionTime,
    });
};
