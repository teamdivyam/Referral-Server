// Notification schema
import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["REFERRAL_CODE_ALLOTED", "WITHDRAWAL", "REFERRAL_CODE_STATUS"],
      default: "REFERRAL_CODE_ALLOTED",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  }, {
    timestamps: true
  }
);

const NotificationModel = mongoose.model("Notification", NotificationSchema);

export default NotificationModel;