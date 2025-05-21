import express from "express";
import ReferralController from "../controllers/referral.js";

const ReferralRouter = express.Router();

ReferralRouter.put(
    "/change-referral-status-pending",
    ReferralController.changeReferralStatusPending
);

ReferralRouter.get(
    "/verify/:referralCode",
    ReferralController.verifyReferralCode
);

export default ReferralRouter;
