import express from "express";
import ReferralController from "../controllers/referral.js";

const ReferralRouter = express.Router();

// GET
ReferralRouter.get("/agent-referrals", ReferralController.getAgentReferrals);


// POST


// PUT
ReferralRouter.put("/change-referral-status-pending", ReferralController.changeReferralStatusPending);



// DELETE
ReferralRouter.delete("/", ReferralController.delete);



export default ReferralRouter;