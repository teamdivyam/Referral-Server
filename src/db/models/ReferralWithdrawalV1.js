import mongoose from "mongoose";

const ReferralWithdrawalSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId },
        amount: {
            type: Number,
            required: true,
            min: 5000,
        },
        status: {
            enum: ["pending", "completed", "rejected"],
            default: "pending"
        }
    },
    {
        timestamps,
    }
);

const ReferralWithdrawalModel = mongoose.model("referralwithdrawal", ReferralWithdrawalSchema);

export default ReferralWithdrawalModel;
