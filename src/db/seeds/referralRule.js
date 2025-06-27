import mongoose from "mongoose";
import ReferralRuleModel from "../models/ReferralRules.js";

mongoose
    .connect("mongodb://localhost:27017/development-referral-program")
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

async function SeedReferralRule() {
    try {
        await ReferralRuleModel.insertOne({
            minWithdrawalAmount: 2500,
            maxWithdrawalAmount: 20000,
            maxWithdrawalPerDay: 2,
            maxReferPerDay: 10,
            referralScript: {
                schedule: 1,
                scheduleTime: "minute"
            }
        });
        console.log("Seed successfully");
    } catch (error) {
        throw new Error(error);
    }
}

SeedReferralRule();
