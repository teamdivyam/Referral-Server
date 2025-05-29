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
        phoneNo: {
            type: String,
            required: true,
            unique: true,
        },
        referralCode: {
            type: String,
            required: true,
            unique: true,
        },
        referralEvents: [
            { type: mongoose.Schema.Types.ObjectId, ref: "referralevent" },
        ],
        wallet: {
            balance: {
                type: Number,
                default: 0,
            },
            pendingBalance: {
                type: Number,
                default: 0,
            },
            totalEarning: {
                type: Number,
                default: 0,
            },
            withdrawalHistory: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "referralwithdrawal",
                },
            ],
            accounts: [{ type: BankAccountSchema, default: null }],
        },
    },
    {
        timestamps: true,
    }
);

const ReferralUserModelV1 = mongoose.model(
    "referraluser",
    ReferralUserSchemaV1
);

export default ReferralUserModelV1;
