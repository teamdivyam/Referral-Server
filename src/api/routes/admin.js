import express from "express";
import AdminController from "../controllers/admin.js";
import isSuperAdmin from "../middlewares/isSuperAdmin.js";

const AdminRouter = express.Router();

AdminRouter.get("/dashboard-analytics", AdminController.getDashboardAnalytics);
AdminRouter.get("/referral-users", AdminController.getMultipleUsers);
AdminRouter.get("/referral-user/:referralUserID", AdminController.getOneReferralUser);
AdminRouter.get("/withdrawals", AdminController.getWithdrawals);
AdminRouter.get("/balance", AdminController.getReferralUserBalance);
AdminRouter.get("/referral-over-time", AdminController.getReferralOverTime);
AdminRouter.get("/latest-payout", AdminController.getLatestPayout);
AdminRouter.get("/cron/status", AdminController.getCronJobStatus);
AdminRouter.get("/referral-settings", AdminController.getReferralSettings);
AdminRouter.get("/referral", AdminController.getReferral);
AdminRouter.get("/sessions", AdminController.getSession);
AdminRouter.get("/verify-admin", AdminController.verifyAdmin);
AdminRouter.get("/get-admins", AdminController.getAdmins);
AdminRouter.get("/verify-admin", AdminController.verifyAdmin);
AdminRouter.post("/create-admin", isSuperAdmin, AdminController.createAdmin);
AdminRouter.patch("/process-withdrawal-request/:processType/:withdrawalID", AdminController.processWithdrawalRequest);
AdminRouter.patch("/change-account-status/:accountStatus/:referralUserID", AdminController.changeReferralUserAccountStatus);
AdminRouter.patch("/cron/:state", AdminController.controlCronJob);
AdminRouter.patch("/update-referral-settings", AdminController.changeReferralSettings);
AdminRouter.patch("/update-referral-schedule", AdminController.updateReferralSchedule);
AdminRouter.patch("/sessions", AdminController.revokeSession);
AdminRouter.patch("/logout", AdminController.logout);
AdminRouter.patch("/reset-password", AdminController.resetPassword);
AdminRouter.delete("/delete-admin/:adminId", AdminController.deleteAdmin);

export default AdminRouter;