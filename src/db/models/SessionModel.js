import mongoose from "mongoose";

const SessionSchema = new mongoose.Schema(
    {
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "admin",
            required: true,
        },
        device: {
            type: {
                type: String,
                enum: ["mobile", "tablet", "desktop", "bot", "unknown"],
                required: true,
            },
            os: String,
            browser: String,
            version: String,
        },
        ipAddress: String,
        userAgent: String,
        location: {
            country: String,
            region: String,
            city: String,
            coordinates: [Number],
        },
        loginAt: {
            type: Date,
            default: Date.now,
        },
        lastActivity: Date,
        token: String,
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

SessionSchema.index({ user: 1, isActive: 1 });
SessionSchema.index({ token: 1 });

const SessionModel = mongoose.model("ReferralAdminSession", SessionSchema );
export default SessionModel;

