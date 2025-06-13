import mongoose from "mongoose";
import ReferralEventModel from "../models/ReferralEventsV1.js";
import ReferralUserModelV1 from "../models/ReferralUserV1.js";

mongoose
    .connect("mongodb://localhost:27017/development-referral-program")
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

const referralUser = { id: "6847f2fb321fd116d74af28b", code: "H7BQYX" };
const orderIds = [
    "68418bdf5422b0f2f007ed91",
    "68418bdf5422b0f2f007ed90",
    "68418bdf5422b0f2f007ed8f",
    "68418bdf5422b0f2f007ed8e",
];
const usersIds = [
    "6847e42f089dc4bb1fa5cf3b",
    "6847e42f089dc4bb1fa5cf3a",
    "6847e42f089dc4bb1fa5cf39",
    "6847e42f089dc4bb1fa5cf38",
];

function Events() {
    const cDate = new Date();
    let pWeekDate = new Date(cDate);
    pWeekDate.setDate(cDate.getDate() - Math.ceil(Math.random() * 100));
    this.referrer = referralUser.id;
    this.referee = usersIds[Math.floor(Math.random() * usersIds.length)];
    this.referralCode = referralUser.code;
    this.orderId = orderIds[Math.floor(Math.random() * orderIds.length)];
    this.amount = 1000;
    this.createdAt = pWeekDate;
}

async function SeedReferralEvents() {
    try {
        const referralEvents = [];

        for (let i = 0; i < 50; i++) {
            referralEvents.push(new Events());
        }

        const results = await ReferralEventModel.insertMany(referralEvents);

        const referralEventIdList = results.map((res) => res._id);

        await ReferralUserModelV1.findByIdAndUpdate(referralUser.id, {
            $push: { referralEvents: referralEventIdList },
            $set: { "wallet.pendingBalance": 50 * 1000 },
        });

        console.log("Seed successfully");
    } catch (error) {
        throw new Error(error);
    }
}

SeedReferralEvents();
