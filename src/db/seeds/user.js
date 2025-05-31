import mongoose from "mongoose";
import UserModel from "../models/user.js";
import { hashPasswordFn } from "../../utils/password.js";

mongoose
    .connect("mongodb://localhost:27017/development-referral-program")
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

const names = [
    "Joe Rogan",
    "Mike Tyson",
    "William Dofoe",
    "Sans Peterson",
    "Mahtab",
    "Jack Deep",
    "Lex Friedman",
    "Raj Shiman",
    "Winky Chappel",
];

function User() {
    this.id = Math.floor(Math.random() * 10000);
    this.fullName = names[Math.ceil(Math.random() * names.length - 1)];
    this.gender = Math.random() > 0.5 ? "male":"female";
    this.mobileNum = Math.floor(1_000_000_000 + Math.random() * 9_000_000_000);
    this.email = this.fullName.toLowerCase().split(" ").join("") + Math.ceil(Math.random() * 1000) +"@gmail.com";
    this.dob = new Date("01/01/2002");
    this.address = "12/35 Kolhapur Jamnagar",
    this.areaPin = "211011";
}


async function SeedAgentDatabase() {
    try {
        const users = [];

        for(let i = 0; i < 100; i++) {
            users.push(new User());
        };

        await UserModel.insertMany(users);

        console.log("Seed successfully");
    } catch (error) {
        throw new Error(error);
    }
}

SeedAgentDatabase();