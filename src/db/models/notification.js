// Notification schema
import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReferralAgent",
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

const NotificationModel = mongoose.model("ReferralNotification", NotificationSchema);

export default NotificationModel;