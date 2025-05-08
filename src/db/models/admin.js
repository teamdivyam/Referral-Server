import mongoose from "mongoose";

const AdminSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    passwordHash: {
        type: String,
        required: true
    }
}, {
    timestamps: true,
    versionKey: false
});

const AdminModel = mongoose.model("ReferralAdmin", AdminSchema);
export default AdminModel;