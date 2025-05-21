import mongoose from "mongoose";
import AgentModel from "../models/agent.js";
import { hashPasswordFn } from "../../utils/password.js";

mongoose
    .connect("mongodb://localhost:27017/development-referral-program")
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

const names = [
    "Adesh Singh",
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

function Agent(hashPassword) {
    this.name = names[Math.ceil(Math.random() * names.length - 1)];
    this.email = this.name.toLowerCase().split(" ").join("") + Math.ceil(Math.random() * 1000) +"@gmail.com";
    this.phoneNumber = Math.floor(1_000_000_000 + Math.random() * 9_000_000_000);
    this.passwordHash = hashPassword;
}


async function SeedAgentDatabase() {
    try {
        const agents = [];

        const hashPassword = await hashPasswordFn("abcd1234");

        for(let i = 0; i < 100; i++) {
            agents.push(new Agent(hashPassword));
        };

        await AgentModel.insertMany(agents);

        console.log("Seed successfully");
    } catch (error) {
        throw new Error(error);
    }
}

SeedAgentDatabase();