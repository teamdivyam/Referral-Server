import mongoose from "mongoose";
import CounterModel from "./CounterModel.js";

const WithdrawalSchema = new mongoose.Schema(
    {
        withdrawal_id: {
            type: String,
            unique: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        referral_user: {
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
        transaction_id: {
            type: String,
            default: null,
        },
        remarks: {
            type: String,
        },
        processed_at: {
            type: Date,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

WithdrawalSchema.pre("save", async function (next) {
    if (!this.withdrawal_id) {
        const counter = await CounterModel.findByIdAndUpdate(
            { _id: "withdrawalId" },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this.withdrawal_id = `WD-${counter.seq}`;
    }
    next();
});

const WithdrawalModel = mongoose.model("referralwithdrawal", WithdrawalSchema);

export default WithdrawalModel;
