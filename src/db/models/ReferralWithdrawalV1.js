import mongoose from "mongoose";

const WithdrawalSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        referralUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "referraluser",
            required: true,
        },
        amount: {
            type: Number,
            required: true,
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
        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "paid"],
            default: "pending",
        },
        transactionId: {
            type: String,
            default: null,
        },
        remarks: {
            type: String,
        },
        requestedAt: {
            type: Date,
            required: true,
        },
        processedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const WithdrawalModel = mongoose.model(
    "referralwithdrawal",
    WithdrawalSchema
);

export default WithdrawalModel;
