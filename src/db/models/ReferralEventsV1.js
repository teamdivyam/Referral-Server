import mongoose from "mongoose";
import CounterModel from "./ReferralCounter.js";

const ReferralEventSchema = new mongoose.Schema(
    {
        // Referral ID  
        ref_id: {
            type: String,
            unique: true,
        },
        // Referral User ID of Referrer
        referrer_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "referraluser"
        },
        // User ID of referrer
        referrer_user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // User ID of referee
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
    if (!this.referralId) {
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
