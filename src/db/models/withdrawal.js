// Withdrawal schema
import mongoose from "mongoose";
import getKolkataTimezone from "../../utils/getKolkataTimezone.js";

const WithdrawalSchema = new mongoose.Schema(
  {
    // Reference to the agent who requested the withdrawal.
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
      required: true,
    },

    // Withdrawal Amount
    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    // The current status of withdrawal request
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending",
      required: true,
    },

    // Additional payment details can be stored in a flexible key-value format.
    paymentDetails: {
      type: Map,
      of: String,
      default: {},
    },

    // The data and time when the withdrawal was requested
    requestedAt: {
      type: Date,
      default: getKolkataTimezone,
    },

    // The date and time when the withdrawal was processed (approved/rejected/completed).
    processedAt: {
      type: Date,
    },

    // Optional remarks or reasons for rejection/approval notes.
    remarks: {
      type: String,
      trim: true,
    },

  },
  { timestamps: true }
);

const WithdrawalModel = mongoose.model("Withdrawal", WithdrawalSchema);

export default WithdrawalModel;
