import express from "express";
import referralController from "../controllers/referralV1.js";

const ReferralRouterV1 = express.Router();

ReferralRouterV1.get("/", referralController.user);
ReferralRouterV1.get("/verify-referral-code", referralController.isReferralCodeValid);
ReferralRouterV1.post("/create-referral-user", referralController.createReferralUser);
ReferralRouterV1.post("/withdrawal", referralController.withdrawal);
ReferralRouterV1.patch("/create-referral-event", referralController.createReferralEvent);

export default ReferralRouterV1;