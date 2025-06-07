import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema(
    {
        transactionId: { type: String, required: true, unique: true },
        withdrawalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "referralwithdrawal",
            required: true,
            unique: true,
        },
        amount: { type: Number, required: true },
        date: { type: Date, required: true },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const TransactionModel = mongoose.model(
    "referraltransaction",
    TransactionSchema
);

export default TransactionModel;
