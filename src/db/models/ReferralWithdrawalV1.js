import mongoose from "mongoose";

const ReferralWithdrawalSchema = new mongoose.Schema(
    {
        referralUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "referraluser",
        },
        amount: {
            type: Number,
            required: true,
            min: 5000,
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        remarks: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const ReferralWithdrawalModel = mongoose.model(
    "referralwithdrawal",
    ReferralWithdrawalSchema
);

export default ReferralWithdrawalModel;
