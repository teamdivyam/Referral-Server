import mongoose from "mongoose";

const ReferralEventSchema = new mongoose.Schema(
    {
        referrer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        referee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        referralCode: { type: String, required: true },
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
        status: {
            type: String,
            enum: ["pending", "completed", "cancelled"],
            default: "pending",
        },
        amount: { type: Number, required: true },
    },
    {
        timestamps: true,
    }
);

const ReferralEventModel = mongoose.model("referralevent", ReferralEventSchema);

export default ReferralEventModel;