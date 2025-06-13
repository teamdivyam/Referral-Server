// import mongoose from "mongoose";
// import createHttpError from "http-errors";
// import logger from "../../logging/index.js";
// import AgentModel from "../../db/models/agent.js";
// import NotificationModel from "../../db/models/notification.js";
// import ReferralModel from "../../db/models/referral.js";

// import {
//     SuccessStatusCode,
//     ErrorStatusCode,
//     ErrorCodes,
// } from "../../utils/constant.js";
// import { getReferralDocUsingReferralCode } from "../service/referral.js";
// import notificationService from "../service/notification.js";

// const ReferralController = {
//     async changeReferralStatusPending(req, res, next) {
//         // Start mongoose transaction
//         const session = await mongoose.startSession();
//         session.startTransaction();

//         try {
//             const { referralCode, userId, order } = req.body;

//             const referral = await ReferralModel.findOne({ referralCode });

//             // If referral code is not exists, return error
//             if (!referral) {
//                 await session.abortTransaction(); // ❌ Abort transaction (rollback changes)
//                 session.endSession(); // End session

//                 return next(
//                     createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
//                         code: ErrorCodes.RESOURCE_NOT_FOUND,
//                         message: "Referral not found",
//                     })
//                 );
//             }

//             // If referral code is not in active state, return error
//             if (referral.status !== "active") {
//                 await session.abortTransaction(); // ❌ Abort transaction (rollback changes)
//                 session.endSession(); // End session

//                 return next(
//                     createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
//                         code: ErrorCodes.RESOURCE_NOT_FOUND,
//                         message: "Referral not found",
//                     })
//                 );
//             }

//             // Create notification
//             // const notification = new NotificationModel({
//             //     agentId: referral.agentId,
//             //     message: `Referral code ${referralCode} is now pending.`,
//             //     type: "REFERRAL_CODE_STATUS",
//             // });

//             const notification = await notificationService.createNotification({
//                 agentId: referral.agentId,
//                 message: `Referral code ${referralCode} is now pending.`,
//                 type: "REFERRAL_CODE_STATUS",
//                 session
//             })

//             /**
//              * Update referral
//              * 1. Change status to pending and add userId and order
//              * 2. Remove referral from agent's active referrals
//              * 3. Add referral to agent's pending referrals
//              * 4. Update agent's pending balance
//              */
//             await ReferralModel.updateOne(
//                 { _id: referral._id },
//                 { $set: { status: "pending", userId, order } },
//                 { session }
//             );
//             await AgentModel.updateOne(
//                 { _id: referral.agentId },
//                 {
//                     $pull: { "referral.active": referral._id },
//                 },
//                 { session }
//             );
//             await AgentModel.updateOne(
//                 { _id: referral.agentId },
//                 {
//                     $push: {
//                         "referral.pending": referral._id,
//                         notifications: notification,
//                     },
//                     $inc: { "wallet.pendingBalance": referral.rewardAmount },
//                 },
//                 { session }
//             );

//             await session.commitTransaction(); // ✅ Commit transaction (save changes)
//             session.endSession();

//             return res.status(SuccessStatusCode.RESOURCE_UPDATED).json({
//                 success: true,
//                 message: "Referral status updated successfully",
//             });
//         } catch (error) {
//             logger.error(
//                 `Failed to change referral status: ${error.message}, Error stack: ${error.stack}`
//             );

//             await session.abortTransaction(); // ❌ Abort transaction (rollback changes)
//             session.endSession(); // End session

//             return next(
//                 createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
//                     code: ErrorCodes.SERVER_DATABASE_ERROR,
//                     message: "Internal Server Error",
//                 })
//             );
//         }
//     },

//     async verifyReferralCode(req, res, next) {
//         try {
//             const { referralCode } = req.params;

//             if (!referralCode) {
//                 return next(
//                     createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
//                         code: ErrorCodes.RESOURCE_NOT_FOUND,
//                         message: "Referral code is invalid!",
//                     })
//                 );
//             }

//             const referral = await getReferralDocUsingReferralCode(
//                 referralCode.toUpperCase()
//             );

//             if (!referral) {
//                 return next(
//                     createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
//                         code: ErrorCodes.RESOURCE_NOT_FOUND,
//                         message: "Referral code is invalid!",
//                     })
//                 );
//             }

//             if (referral.status !== "active") {
//                 return next(
//                     createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
//                         code: ErrorCodes.RESOURCE_NOT_FOUND,
//                         message: "Referral code is invalid!",
//                     })
//                 );
//             }

//             res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
//                 success: true,
//                 message: "Referral code is exist!",
//             });
//         } catch (error) {
//             logger.error(
//                 `Failed to verify referral code: ${error.message}, Error stack: ${error.stack}`
//             );

//             return next(
//                 createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
//                     code: ErrorCodes.SERVER_DATABASE_ERROR,
//                     message: "Internal Server Error",
//                 })
//             );
//         }
//     },
// };

// export default ReferralController;
