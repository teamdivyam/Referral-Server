import { Schema, model } from "mongoose";

const officeUserSchema = new Schema(
    { 
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true
        },
        role: {
            type: Schema.Types.ObjectId,
            ref: "Role",
            required: true,
            index: true,
            default: "USER"
        }
    },
    {
        timestamps: true
    }
);

const OfficeUser = model("OfficeUser", officeUserSchema);

export default OfficeUser;