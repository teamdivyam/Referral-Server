import express from "express";
import referralController from "../controllers/referralV1.js";

const ReferralRouterV1 = express.Router();

ReferralRouterV1.get("/user/:userID", referralController.user);
ReferralRouterV1.get(
    "/verify-referral-code",
    referralController.isReferralCodeValid
);
ReferralRouterV1.post(
    "/create-referral-user/:userID",
    referralController.createReferralUser
);
ReferralRouterV1.post(
    "/create-referral-event",
    referralController.createReferralEvent
);
ReferralRouterV1.post("/withdrawal/:userID", referralController.withdrawal);
ReferralRouterV1.post(
    "/add-bank-account/:userID",
    referralController.addBankAccount
);
ReferralRouterV1.patch(
    "/set-primary-account/:userID",
    referralController.setBankAccountPrimary
);


export default ReferralRouterV1;
