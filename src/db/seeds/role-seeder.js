import { RoleModel } from "../models/role.model.js";
import mongoose from "mongoose";

mongoose
    .connect("mongodb://localhost:27017/development-referral-program")
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

const seedRoles = async () => {
    const roles = [
        {
            name: "ADMIN",
            description: "Authenticated user with minimal write access",
        },
        {
            name: "SUPER_ADMIN",
            description: "Authenticated user with full access",
        },
    ];

    for (const role of roles) {
        const existingRole = await RoleModel.findOne({ name: role.name });

        if (!existingRole) {
            await RoleModel.create(role);
        }
    }

    console.log("Seed successfully");
};

seedRoles();
