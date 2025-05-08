import express from "express";
import AgentController from "../controllers/agent.js";
import WalletController from "../controllers/wallets.js";

const AgentRouter = express.Router();

/** --------------------GET--------------------- */
AgentRouter.get("/me", AgentController.me); 
AgentRouter.get("/withdrawal-history", WalletController.getWithdrawalHistory);
AgentRouter.get("/notifications", AgentController.getNotifications);

/** --------------------POST--------------------- */
AgentRouter.get("/withdrawal", WalletController.getWithdrawalHistory);
AgentRouter.post("/request-withdrawal", WalletController.requestWithdrawal); // Request withdrawal



/** --------------------PUT--------------------- */
AgentRouter.put("/update-profile", AgentController.updateProfile); // Update Agent profile
AgentRouter.put("/add-bank-details", AgentController.addBankDetails);
AgentRouter.put("/mark-notification-read", AgentController.markNotificationRead); // Mark notification as read
AgentRouter.put("/set-primary-account", AgentController.setBankAccountPrimary);


/** --------------------DELETE--------------------- */


export default AgentRouter;