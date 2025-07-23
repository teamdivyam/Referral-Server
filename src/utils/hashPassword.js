import bcrypt from "bcryptjs";
import { HASH_SALT_ROUNDS } from "./constant.js";

export const hashPasswordFn = async (password) => {
    try {
        const salt = await bcrypt.genSalt(HASH_SALT_ROUNDS);
        const hashPassword = await bcrypt.hash(password, salt);
        return hashPassword;
    } catch (error) {
        throw new Error(`Error occurred during password hashing: ${error.message}`);
    }
}

export const comparePassword = async (password, hashPassword) => {
    try {
        return await bcrypt.compare(password, hashPassword);
    } catch (error) {
        throw new Error(`Error occurred during password comparison: ${error.message}`);
    }
}