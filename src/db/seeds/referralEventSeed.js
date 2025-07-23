import mongoose from "mongoose";
import ReferralEventModel from "../models/ReferralEventsV1.js";
import ReferralUserModelV1 from "../models/ReferralUserV1.js";

mongoose
    .connect("mongodb://localhost:27017/development-referral-program")
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

const referralUser = {
    id: "68622d5e2d4ed211bb868d36",
    userId: "685fdda002f712342d419085",
    code: "04CS1Q",
};
const orderIds = [
    "68418bdf5422b0f2f007ed88",
    "68418bdf5422b0f2f007ed8b",
    "68418bdf5422b0f2f007ed8e",
];
const usersIds = [
    "685fdda002f712342d419083",
    "685fdda002f712342d419084",
    "685fdda002f712342d419085",
    "685fdda002f712342d419086",
];
let ref_id = 1101;

function Events() {
    const cDate = new Date();
    let pWeekDate = new Date(cDate);
    pWeekDate.setDate(cDate.getDate() - Math.ceil(Math.random() * 100));

    this.ref_id = `REF-${ref_id}`;
    this.referrer_id = referralUser.id;
    this.referrer_user_id = referralUser.userId;
    this.referee_user_id =
        usersIds[Math.floor(Math.random() * usersIds.length)];
    this.referral_code = referralUser.code;
    this.order = orderIds[Math.floor(Math.random() * orderIds.length)];
    this.amount = 1000;
    this.createdAt = pWeekDate;

    ref_id++;
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
            $inc: { "wallet.pendingBalance": 50 * 1000 },
        });

        console.log("Seed successfully");
    } catch (error) {
        throw new Error(error);
    }
}

SeedReferralEvents();
