// User schema with basic information
import mongoose from "mongoose";

// Address schema (embedded in User)
const AddressSchema = new mongoose.Schema(
  {
    addressLine1: {
      type: String,
      required: true,
    },
    addressLine2: String,
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false, timestamps: true }
);

// Bank Account schema (embedded in User)
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
    ifscCode: {
      type: String,
      required: true,
      trim: true,
    },
    accountType: {
      type: String,
      required: true,
      enum: ["SAVINGS", "CHECKING", "CURRENT"],
      default: "SAVINGS"
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

// Main User schema
const AgentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      required: true,
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    address: {
      type: AddressSchema,
      default: null,
    },
    bankAccounts: [
      {
        type: BankAccountSchema,
        default: [],
      },
    ],
    
    referral: {
      active: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Referral",
        default: [],
      }],
      pending: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Referral",
        default: [],
      }],
      used: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Referral",
        default: [],
      }],
    },

    wallet: {
      totalEarningAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
      pendingWithdrawalAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
      balance: {
        type: Number,
        default: 0,
        min: 0,
      },
      pendingBalance: {
        type: Number,
        default: 0,
        min: 0,
      },
      withdrawalHistory: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Withdrawal",
          default: [],
        },
      ],
    },
    userProfileCompleteStatus: {
      profile: {
        type: Boolean,
        default: false,
      },
      bank: {
        type: Boolean,
        default: false,
      },
    },

    notifications: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Notification",
        default: [],
      },
    ],
  },
  {
    timestamp: true,
    versionKey: false,
  }
);


// Create models
const AgentModel = mongoose.model("ReferralAgent", AgentSchema);

export default AgentModel;
