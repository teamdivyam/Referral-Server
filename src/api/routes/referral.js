import express from "express";
import referralController from "../controllers/referral.js";

const ReferralRouter = express.Router();

ReferralRouter.get("/user/:userID", referralController.user);
ReferralRouter.get("/user-referral/:userID", referralController.userReferral);
ReferralRouter.get("/wallet/:userID", referralController.userWallet);
ReferralRouter.get(
    "/verify-referral-code",
    referralController.isReferralCodeValid
);
ReferralRouter.post(
    "/create-referral-user/:userID",
    referralController.createReferralUser
);
ReferralRouter.post(
    "/create-referral-event",
    referralController.createReferralEvent
);
ReferralRouter.post("/withdrawal/:userID", referralController.withdrawal);
ReferralRouter.post(
    "/add-bank-account/:userID",
    referralController.addBankAccount
);

ReferralRouter.patch(
    "/set-primary-account/:userID",
    referralController.setBankAccountPrimary
);

export default ReferralRouter;
