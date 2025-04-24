import createHttpError from "http-errors";
import AgentModel from "../../db/models/agent.js";
import ReferralModel from "../../db/models/referral.js";
import {
  ErrorStatusCode,
  ErrorCodes,
  SuccessStatusCode,
} from "../../utils/constant.js";
import { latestReferrals } from "../service/referral.js";

const DashboardController = {
  /**
   * @function overview
   * @description Retreiving dashboard infromation
   * such as total referrals, total earnings, withdrawalAmount,
   * pending balance, recent referrals and available referral code
   *
   */
  async overview(req, res, next) {
    try {
      const [agent, latestReferrals] = await Promise.all([
        AgentModel.findById(req.user._id)
          .populate("referral.active")
          .select("referral.active referral.used")
      ]);

      return res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
        active: agent.referral.active,
        used: agent.referral.used.length,
      });

    } catch (error) {
      console.log("Error fetching dashboard overview:", error);

      return next(
        createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
          code: ErrorCodes.SERVER_DATABASE_ERROR,
          message: "Internal Server Error",
        })
      );
    }
  },
};

export default DashboardController;
