import express from "express";
import AdminController from "../controllers/admin.js";

const AdminRouter = express.Router();

AdminRouter.get("/dashboard-analytics", AdminController.getDashboardAnalytics);
AdminRouter.get("/referral-users", AdminController.getMultipleReferralUsers);
AdminRouter.get("/referral-user/:referralUserID", AdminController.getOneReferralUser);
AdminRouter.get("/withdrawals", AdminController.getWithdrawals);
AdminRouter.get("/balance", AdminController.getReferralUserBalance);
AdminRouter.get("/referral-over-time", AdminController.getReferralOverTime);
AdminRouter.get("/latest-payout", AdminController.getLatestPayout);
AdminRouter.patch("/process-withdrawal-request/:processType/:withdrawalID", AdminController.processWithdrawalRequest);
AdminRouter.patch("/change-account-status/:accountStatus/:referralUserID", AdminController.changeReferralUserAccountStatus);

export default AdminRouter;