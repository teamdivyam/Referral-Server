import mongoose from "mongoose";

// const Actors = ["USER", "ADMIN"];
// const Events = [
//     "create-referral-event",
//     "withdrawal",
//     "approved-payout",
//     "rejected-payout",
// ];
// const UserAgentType = [];
export const Actions = {
    APPROVED_WITHDRWAWAL_REQUEST: "APPROVED_WITHDRWAWAL_REQUEST",
    REJECTED_WITHDRAWAL_REQUEST: "REJECTED_WITHDRAWAL_REQUEST",
    DEACTIVATE_ACCOUNT: "DEACTIVATE_ACCOUNT",
    ACTIVATE_ACCOUNT: "ACTIVATE_ACCOUNT"
}

const AuditLogSchema = new mongoose.Schema(
    {
        // actor: {
        //     type: String,
        //     enum: Actors,
        //     required: true,
        // },
        // metadata: {
        //     type: mongoose.Schema.Types.Mixed,
        // },
        // ipAddress: {
        //     type: String,
        //     required: true,
        // },
        // event: {
        //     type: {
        //         type: String,
        //         enum: Events,
        //     },
        //     metadata: {
        //         type: mongoose.Schema.Types.Mixed
        //     }
        // },
        // userAgent: {
        //     type: String,
        //     required: true,
        // },
        // userAgentType: {
        //     type: String,
        //     enum: UserAgentType,
        // },
        // expiredAt: {
        //     type: Date,
        //     expires: 0
        // }
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        action: {
            type: Object.values(Actions),
            required: true,
        },
        ipAddress: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const AuditLogModel = mongoose.model("auditlog", AuditLogSchema);
export default AuditLogModel;
