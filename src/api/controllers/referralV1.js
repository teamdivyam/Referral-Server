import createHttpError from "http-errors";
import ReferralUserModelV1 from "../../db/models/ReferralUserV1.js";
import {
    ErrorCodes,
    ErrorStatusCode,
    SuccessStatusCode,
} from "../../utils/constant.js";
import generateReferralCode from "../../utils/genReferralCodeV1.js";
import logger from "../../logging/index.js";
import ReferralEventModel from "../../db/models/ReferralEventsV1.js";
import UserModel from "../../db/models/user.js";
import ReferralWithdrawalModel from "../../db/models/ReferralWithdrawalV1.js";
import mongoose from "mongoose";

const referralController = {
    createReferralUser: async (req, res, next) => {
        try {
            const { userID } = req.params;

            const user = await UserModel.findById(userID);

            if (!user) {
                return next(
                    createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
                        code: ErrorCodes.RESOURCE_NOT_FOUND,
                        message: "User is not exists!",
                    })
                );
            }
            if (user.refer.isReferrer) {
                return next(
                    createHttpError(ErrorStatusCode.RESOURCE_ALREADY_EXISTS, {
                        code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
                        message: "User have already a referral Code!",
                    })
                );
            }

            const referralCode = generateReferralCode();

            const newReferralUser = await ReferralUserModelV1.insertOne({
                user: userID,
                referralCode,
            });

            user.refer.isReferrer = true;
            user.refer.referralId = newReferralUser._id;

            await user.save();

            res.status(SuccessStatusCode.RESOURCE_CREATED).json({
                success: true,
            });
        } catch (error) {
            logger.error(
                `Error in creating referral user: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    },

    user: async (req, res, next) => {
        try {
            const { userID } = req.params;

            const user = await ReferralUserModelV1.findOne({
                user: userID,
            }).populate("user");

            if (!user) {
                return next(
                    createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
                        code: ErrorCodes.RESOURCE_NOT_FOUND,
                        message:
                            "User is not registered for refer & earn program!",
                    })
                );
            }

            res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                user,
            });
        } catch (error) {
            logger.error(
                `Error in retreiving referral user: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    },

    createReferralEvent: async (req, res, next) => {
        try {
            const { referralCode, refereeId, orderId } = req.query;

            const referralUser = await ReferralUserModelV1.findOne({ referralCode });

            if (!user || user.accountStatus === "deactive") {
                return next(
                    createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
                        code: ErrorCodes.RESOURCE_NOT_FOUND,
                        message: "Invalid referral code!",
                    })
                );
            }

            const newReferralEvent = await ReferralEventModel.insertOne({
                referrer: referralUser._id,
                referee: refereeId,
                referralCode: referralUser.referralCode,
                orderId: orderId,
            });

            referralUser.referralEvents.push(newReferralEvent._id);

            await user.save();

            res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                success: true,
            });
        } catch (error) {
            logger.error(
                `Error in create referral event: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    },

    withdrawal: async (req, res, next) => {
        const MIN_WITHDRAWAL_AMOUNT = 5000;

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { userID } = req.params;
            const { amount } = req.body;

            const referralUser = await ReferralUserModelV1.findOne({
                user: userID,
            });

            if (referralUser.wallet.balance < MIN_WITHDRAWAL_AMOUNT) {
                await session.abortTransaction();
                session.endSession();

                return next(
                    createHttpError(ErrorStatusCode.INSUFFECIENT_BALANCE, {
                        code: ErrorCodes.INSUFFECIENT_BALANCE,
                        message: "Insuffecient Balance",
                    })
                );
            }

            const newReferralWithdrawal =
                await ReferralWithdrawalModel.insertOne({
                    referralUserId: referralUser._id,
                    amount: amount,
                });

            referralUser.wallet.balance =
                referralUser.wallet.balance - newReferralWithdrawal.amount;
            referralUser.wallet.pendingWithdrawal =
                referralUser.wallet.pendingWithdrawal + newReferralWithdrawal.amount;

            referralUser.wallet.withdrawals.push(
                newReferralWithdrawal._id
            );

            await referralUser.save();

            res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                success: true,
            });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();

            logger.error(
                `Error in initating withdrawal: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    },

    isReferralCodeValid: async (req, res, next) => {
        try {
            const { referralCode } = req.query;

            const isValid = await ReferralUserModelV1.findOne({ referralCode });

            if (!isValid) {
                return next(
                    createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
                        code: ErrorCodes.RESOURCE_NOT_FOUND,
                        message: "Invalid referral code!",
                    })
                );
            }

            res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                success: true,
            });
        } catch (error) {
            logger.error(
                `Error in verify referral code: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    },
};

export default referralController;
