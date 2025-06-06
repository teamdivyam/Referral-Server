import mongoose from "mongoose";
import { CronJob } from "cron";
import { configDotenv } from "dotenv";

configDotenv();

import ReferralEventModel from "../src/db/models/ReferralEventsV1.js";
import ReferralUserModelV1 from "../src/db/models/ReferralUserV1.js";
import OrderModel from "../src/db/models/order.js";

(async () => {
    try {
        const db = await mongoose.connect(process.env.MONGODB_URI);
        db.connection.db.admin().command({
            setParameter: 1,
            maxTransactionLockRequestTimeoutMillis: 3000,
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

                    if (orderStatusTypeRejected.includes(orderStatus)) {
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

                    if (orderStatusTypeCompleted.includes(orderStatus)) {
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
    },
    null,
    true,
    "Asia/Kolkata"
);
