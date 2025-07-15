import mongoose from "mongoose";
import CounterModel from "./ReferralCounter.js";

const ReferralEventSchema = new mongoose.Schema(
    {
        // Referral ID  
        ref_id: {
            type: String,
        },
        // Referral ID of User
        referrer_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "referraluser"
        },
        // User ID of Referral User
        referrer_user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // User ID of Referee
        referee_user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        referral_code: {
            type: String,
            required: true,
        },
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
        },
        status: {
            type: String,
            enum: ["pending", "completed", "cancelled"],
            default: "pending",
            index: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        processed_at: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

ReferralEventSchema.pre("save", async function (next) {
    if (!this.ref_id) {
        const counter = await CounterModel.findByIdAndUpdate(
            { _id: "referralEventId" },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this.ref_id = `REF-${counter.seq}`;
    }
    next();
});

const ReferralEventModel = mongoose.model("referralevent", ReferralEventSchema);

export default ReferralEventModel;
