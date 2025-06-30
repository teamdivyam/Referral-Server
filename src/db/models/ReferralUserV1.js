import mongoose from "mongoose";

const BankAccountSchema = new mongoose.Schema(
    {
        bankName: {
            type: String,
            required: true,
            trim: true,
        },
        accountHolderName: {
            type: String,
            required: true,
            trim: true,
        },
        accountNumber: {
            type: String,
            required: true,
            trim: true,
        },
        codeIFSC: {
            type: String,
            required: true,
            trim: true,
        },
        accountType: {
            type: String,
            required: true,
            enum: ["SAVINGS", "CHECKING", "CURRENT"],
            default: "SAVINGS",
        },
        isPrimary: {
            type: Boolean,
            default: false,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const ReferralUserSchemaV1 = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            unique: true,
            required: true,
        },
        referralCode: {
            type: String,
            unique: true,
            required: true,
        },
        referralEvents: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: "referralevent",
            default: [],
        },
        wallet: {
            balance: {
                type: Number,
                min: 0,
                default: 0,
            },
            pendingBalance: {
                type: Number,
                min: 0,
                default: 0,
            },
            pendingWithdrawal: {
                type: Number,
                min: 0,
                default: 0,
            },
            totalEarning: {
                type: Number,
                min: 0,
                default: 0,
            },
            withdrawals: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "referralwithdrawal",
                },
            ],
            accounts: [{ type: BankAccountSchema, default: null }],
        },
        accountStatus: {
            type: String,
            enum: ["active", "deactive"],
            default: "active",
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const ReferralUserModelV1 = mongoose.model(
    "referraluser",
    ReferralUserSchemaV1
);

export default ReferralUserModelV1;
