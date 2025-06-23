import cron from "node-cron";
import mongoose from "mongoose";

import ReferralEventModel from "../src/db/models/ReferralEventsV1.js";
import ReferralUserModelV1 from "../src/db/models/ReferralUserV1.js";
import OrderModel from "../src/db/models/order.js";

let cronJob = null;
let lastExecutionTime = null;

const orderStatusType = {
    completed: ["Completed"],
    rejected: ["Cancelled", "Refunded"],
};

const jobFunction = async () => {
    console.log("Running scheduled job...");
    lastExecutionTime = new Date();

    try {
        // Retreive referral that is pending and populate order to check it is complete or not
        const pendingReferrals = await ReferralEventModel.find({
            status: "pending",
        }).populate("orderId");

        for (const referral of pendingReferrals) {
            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                const orderStatus = referral.orderId.orderStatus;

                if (orderStatusType.completed.includes(orderStatus)) {
                    referral.status = "completed";

                    await ReferralUserModelV1.findByIdAndUpdate(
                        referral.referrer,
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

                    await ReferralUserModelV1.findByIdAndUpdate(
                        referral.referrer,
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
