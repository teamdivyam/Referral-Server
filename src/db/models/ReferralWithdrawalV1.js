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
            default: null,
        },
        bank: {
            name: {
                type: String,
                required: true,
            },
            accountHolderName: {
                type: String,
                required: true,
            },
            accountNumber: {
                type: String,
                required: true,
            },
            codeIFSC: {
                type: String,
                required: true,
            },
        },
        paidAt: {
            type: Date,
        },
        transactionRef: {
            type: String,
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
