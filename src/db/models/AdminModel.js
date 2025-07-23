import mongoose from "mongoose";
import validator from "validator";
import { ROLES } from "../../utils/constant.js";

const AdminSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        maxLength: [50, "Name cannot exceed 50 character"],
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, "Please provide a valid email"]
    },
    phone: {
        type: String,
        validate: {
            validator: function(v) {
                return validator.isMobilePhone(v, 'any', { strictMode: false});
            },
            message:"Invalid phone number"
        }
    },
    role: {
        type: String,
        enum: Object.values(ROLES),
    },
    password: {
        type: String,
        required: [true, "Password is required"],
    },
    adminId: {
        type: String,
        required: true,
    }
    
}, {
    timestamps: true,
    versionKey: false
});

const AdminModel = mongoose.model("ReferralAdmin", AdminSchema);
export default AdminModel;