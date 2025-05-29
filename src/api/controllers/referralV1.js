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

const referralController = {
    createReferralUser: async (req, res, next) => {
        try {
            const { phoneNo } = req.query;

            const user = await ReferralUserModelV1.findOne({ phoneNo });

            if (user) {
                return next(
                    createHttpError(ErrorStatusCode.RESOURCE_ALREADY_EXISTS, {
                        code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
                        message: "User is already existed",
                    })
                );
            }

            const referralCode = generateReferralCode();

            const newUser = await ReferralUserModelV1.insertOne({
                phoneNo,
                referralCode,
            });

            res.status(SuccessStatusCode.RESOURCE_CREATED).json({
                success: true,
                message: "Referral code created successfully for this user.",
                referralCode: newUser.referralCode,
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
            const { phoneNo } = req.query;

            const user = await ReferralUserModelV1.findOne({ phoneNo });

            if (!user) {
                return next(
                    createHttpError(ErrorStatusCode.RESOURCE_ALREADY_EXISTS, {
                        code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
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

            const user = await ReferralUserModelV1.findOne({ referralCode });

            if (!user) {
                return next(
                    createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
                        code: ErrorCodes.RESOURCE_NOT_FOUND,
                        message: "Invalid referral code!",
                    })
                );
            }

            const newReferralEvent = await ReferralEventModel.insertOne({
                referrer: user._id,
                referee: refereeId,
                referralCode: referralCode,
                orderId: orderId,
            });

            user.referralEvents.push(newReferralEvent);

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
        try {
        } catch (error) {}
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
