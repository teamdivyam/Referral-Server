import mongoose from "mongoose";

const orderAddress = new mongoose.Schema({
    area: { type: String },
    landMark: { type: String },
    city: { type: String },
    state: { type: String },
    contactNumber: { type: Number },
    pinCode: { type: String },
    area: { type: String },
    isActive: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema(
    {
        id: { type: String, required: true, unique: true },
        fullName: { type: String },
        gender: { type: String },
        mobileNum: { type: String, required: true, unique: true },
        email: { type: String },
        dob: { type: Date },
        avatar: { type: String },
        address: { type: String },
        areaPin: { type: String },
        orders: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Order",
            },
        ],
        orderAddress: [
            {
                type: orderAddress,
                default: "null",
            },
        ],
        role: {
            type: String,
            enum: ["user"],
            default: "user",
        },
        accessToken: { type: String },
        otp: { type: mongoose.Types.ObjectId, ref: "otp", require: true },
        isVerified: { type: Boolean, default: false },
        refer: {
            isReferrer: { type: Boolean, default: false },
            referralId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "referraluser",
            },
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

const UserModel = mongoose.model("User", userSchema);
export default UserModel;