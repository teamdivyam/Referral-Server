import express from "express";
import AdminController from "../controllers/admin.js";
import AdminAuthController from "../controllers/adminAuth.js";

const AdminRouter = express.Router();

/** --------------------GET--------------------- */
AdminRouter.get("/agents", AdminController.getAgents);
AdminRouter.get("/agent/:agentId", AdminController.getAgentById);
AdminRouter.post("/assign-referral-code/:agentId", AdminController.assignReferralCode);
AdminRouter.put("/change-account-status/:accountStatus/:agentId", AdminController.agentAccountStatusChange);
AdminRouter.put("/process-withdrawal-request/:processType/:withdrawalId", AdminController.processWithdrawalRequest);



export default AdminRouter;