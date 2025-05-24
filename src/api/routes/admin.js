import express from "express";
import AdminController from "../controllers/admin.js";
import AdminAuthController from "../controllers/adminAuth.js";

const AdminRouter = express.Router();

/** --------------------GET--------------------- */
AdminRouter.get("/dashboard-analytics", AdminController.getDashboardAnalytics);
AdminRouter.get("/agents", AdminController.getMultipleAgent);
AdminRouter.get("/agent/:agentID", AdminController.getOneAgent);
AdminRouter.post("/assign-referral-code/:agentID", AdminController.assignReferralCode);
AdminRouter.put("/change-account-status/:accountStatus/:agentID", AdminController.agentAccountStatusChange);
AdminRouter.put("/process-withdrawal-request/:processType/:withdrawalID", AdminController.processWithdrawalRequest);



export default AdminRouter;