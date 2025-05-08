import express from "express";
import AdminController from "../controllers/admin.js";
import AdminAuthController from "../controllers/adminAuth.js";

const AdminRouter = express.Router();

/** --------------------GET--------------------- */
AdminRouter.get("/agent", AdminController.getAgents);
AdminRouter.get("/agent/agentId/:agentId", AdminController.getAgentUsingId);
AdminRouter.get("/agent/search", AdminController.getAgentUsingSearch);


/** --------------------POST--------------------- */
AdminRouter.post("/allot-refer-code", AdminController.allotReferCodes);


/** --------------------PUT--------------------- */
AdminRouter.put("/approved-withdrawal", AdminController.approvedWithdrawRequest);
AdminRouter.put("/reject-withdrawal", AdminController.rejectWithdrawRequest);



/** --------------------DELETE--------------------- */



export default AdminRouter;