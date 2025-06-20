import { Schema, model } from "mongoose";

const RoleTypes = {
    ADMIN: "ADMIN",
    SUPER_ADMIN: "SUPER_ADMIN",
};

const roleSchema = new Schema(
    {
        name: {
            type: String,
            enum: Object.values(RoleTypes),
            required: true,
            unique: true,
        },
        description: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const RoleModel = model("Role", roleSchema);

export { RoleModel, RoleTypes }