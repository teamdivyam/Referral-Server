import mongoose from "mongoose";

const referralRuleSchema = new mongoose.Schema({
    minWithdrawalAmount: {
        type: Number,
        required: true,
        min: 100
    },
    maxWithdrawalAmount: {
        type: Number,
        required: true,
    },
    maxWithdrawalPerDay: {
        type: Number,
        required: true,
    },
    maxReferPerDay: {
        type: Number,
        required: true,
    },
    referralScript: {
        schedule: {
            type: Number,
            required: true,
        },
        scheduleTime: {
            type: String,
            enum: ["second", "minute", "hour", "day"]
        }
    }
}, {
    timestamps: true,
    versionKey: false
});

const ReferralRuleModel = mongoose.model("referralrule", referralRuleSchema);

export default ReferralRuleModel;