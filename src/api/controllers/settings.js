import AgentModel from "../../db/models/agent.js";
import createHttpError from "http-errors";
import { SuccessStatusCode, ErrorStatusCode, ErrorCodes } from "../../utils/constant.js";

const SettingsController = {
  // GET: Get user's saved bank details
  async getBankDetails(req, res, next) {
    try {
      const agent = await AgentModel.findById(req.user._id).select(
        "bankAccounts"
      );

      res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
        bankAccounts: agent.bankAccounts,
      });

    } catch (error) {
      return next(
        createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
          code: ErrorCodes.SERVER_DATABASE_ERROR,
          message: "Internal Server Error",
        })
      );
    }
  },

  // POST: Add bank details
  async addBankDetails(req, res, next) {},

  // PUT: Edit bank details
  async updateBankDetails(req, res, next) {},

  // GET: get notifications preference
  async getNotifications(req, res, next) {},

  // PUT: update notifications preference
  async updateNotifications(req, res, next) {},
};

export default SettingsController;
