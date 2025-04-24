// Referral Transaction schema
import mongoose from "mongoose";
import { REWARD_AMOUNT } from "../../utils/constant.js";

const ReferralSchema = new mongoose.Schema(
  {
    // Unique referral code used by the referrer.
    referralCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Status of the referral. It tracks the referral lifecycle.
    status: {
      type: String,
      required: true,
      enum: ["active", "pending", "used"],
      default: "active",
    },

    // The agent who referred the user.
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
      required: true,
    },

    // The user who was referred. This field may be null until the user use.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },    

    // Order (Ref: Order) associated with the referral.
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },

    // Reward amount that can be credited for a successful referral.
    rewardAmount: {
      type: Number,
      required: true,
      default: REWARD_AMOUNT,
      min: 0,
    },

    
  },
  { timestamps: true }
);

// Set TTL(expires) to 30 days
ReferralSchema.index({ createdAt: 1}, { expireAfterSeconds: 30 * 24 * 60 * 60})

const ReferralModel = mongoose.model(
  "Referral",
  ReferralSchema
);

export default ReferralModel;
