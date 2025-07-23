import mongoose from "mongoose";
import createHttpError from "http-errors";
import ReferralUserModel from "../../db/models/ReferralUserModel.js";
import ReferralEventModel from "../../db/models/ReferralEventModel.js";
import UserModel from "../../db/models/UserModel.js";
import ReferralWithdrawalModel from "../../db/models/ReferralWithdrawalModel.js";
import ReferralRuleModel from "../../db/models/ReferralRulesModel.js";
import generateReferralCode from "../../utils/generateCode.js";
import logger from "../../logging/index.js";
import {
    ErrorCodes,
    ErrorStatusCode,
    HTTPStatus,
    SuccessStatusCode,
} from "../../utils/constant.js";
import {
    AmountValidation,
    BankValidation,
    objectIdValidation,
} from "../validators/referral.js";

const referralController = {
    createReferralUser: async (req, res, next) => {
        try {
            const { userID } = req.params;

            const user = await UserModel.findById(userID);

            if (!user) {
                return next(
                    createHttpError(HTTPStatus.BAD_REQUEST, {
                        code: "VALIDATION_FORMAT",
                        message: "User ID is invalid",
                    })
                );
            }
            if (user.refer.isReferrer) {
                return next(
                    createHttpError(HTTPStatus.FORBIDDEN, {
                        code: "BAD_REQUEST",
                        message: "User already have a referral code",
                    })
                );
            }

            const referralCode = generateReferralCode();

            const newReferralUser = await ReferralUserModel.insertOne({
                user: userID,
                referralCode,
            });

            user.refer.isReferrer = true;
            user.refer.referralId = newReferralUser._id;

            await user.save();

            res.status(HTTPStatus.RESOURCES_CREATED).json({
                success: true,
            });
        } catch (error) {
            logger.error(
                `POST: create-referral-user ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(HTTPStatus.SERVER_ERROR, {
                    code: "SERVER_ERROR",
                    message: "Internal Server Error",
                })
            );
        }
    },

    user: async (req, res, next) => {
        try {
            const { userID } = req.params;

            if (!objectIdValidation(userID)) {
                return next(
                    createHttpError(HTTPStatus.BAD_REQUEST, {
                        code: "VALIDATION_FORMAT",
                        message: "User ID is invalid",
                    })
                );
            }

            const user = await ReferralUserModel.findOne({
                user: userID,
            }).populate("user wallet.withdrawals");

            if (!user) {
                return next(
                    createHttpError(HTTPStatus.BAD_REQUEST, {
                        code: "BAD_REQUEST",
                        message: "User doesn't exits with this ID",
                    })
                );
            }

            res.status(HTTPStatus.SUCCESS).json({
                success: true,
                user,
            });
        } catch (error) {
            logger.error(
                `GET: referral-user ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(HTTPStatus.SERVER_ERROR, {
                    code: "SERVER_ERROR",
                    message: "Internal Server Error",
                })
            );
        }
    },

    userReferral: async (req, res, next) => {
        try {
            const { userID } = req.params;

            if (!objectIdValidation(userID)) {
                return next(
                    createHttpError(HTTPStatus.BAD_REQUEST, {
                        code: "VALIDATION_FORMAT",
                        message: "User ID is invalid",
                    })
                );
            }

            const referral = await ReferralUserModel.find({ user: userID })
                .select("referralCode referralEvents")
                .populate({
                    path: "referralEvents",
                    select: "status amount createdAt updatedAt",
                });

            if (!referral) {
                return next(
                    createHttpError(HTTPStatus.NOT_FOUND, {
                        code: "USERS_REFERRAL_NOT_FOUND",
                        message: "User referral not found",
                    })
                );
            }

            res.json({
                success: true,
                referral,
            });
        } catch (error) {
            logger.error(
                `GET: user-referrals ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(HTTPStatus.SERVER_ERROR, {
                    code: "SERVER_ERROR",
                    message: "Internal Server Error",
                })
            );
        }
    },

    userWallet: async (req, res, next) => {
        try {
            const { userID } = req.params;

            const user = await ReferralUserModel.findOne({
                user: userID,
            })
                .select("wallet")
                .populate({
                    path: "wallet.withdrawals",
                    options: { sort: { updatedAt: -1 } },
                });

            if (!user) {
                return next(
                    createHttpError(HTTPStatus.BAD_REQUEST, {
                        code: "VALIDATION_FORMAT",
                        message: "User ID is invalid",
                    })
                );
            }

            res.status(HTTPStatus.SUCCESS).json({
                wallet: user.wallet,
            });
        } catch (error) {
            logger.error(
                `GET: user-wallet ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(HTTPStatus.SERVER_ERROR, {
                    code: "SERVER_ERROR",
                    message: "Internal Server Error",
                })
            );
        }
    },

    createReferralEvent: async (req, res, next) => {
        try {
            const { referralCode, refereeId, orderId, amount } = req.query;

            const referralUser = await ReferralUserModel.findOne({
                referralCode,
            });

            if (referralUser.user.equals(refereeId)) {
                return res.json({
                    success: false,
                    message: "You cannot use your own referral code",
                });
            }

            if (!referralUser || referralUser.accountStatus === "deactive") {
                return res.json({
                    success: false,
                    message: "Invalid referral code",
                });
            }

            const newReferralEvent = await ReferralEventModel.insertOne({
                referrer_id: referralUser._id,
                referrer_user_id: referralUser.user,
                referee_user_id: refereeId,
                referral_code: referralUser.referralCode,
                order: orderId,
                amount: amount,
            });

            referralUser.wallet.pendingBalance += Number(
                newReferralEvent.amount
            );
            referralUser.referralEvents.push(newReferralEvent._id);

            await referralUser.save();

            res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                success: true,
            });
        } catch (error) {
            logger.error(
                `POST: create-referral-event ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(HTTPStatus.SERVER_ERROR, {
                    code: "SERVER_ERROR",
                    message: "Internal Server Error",
                })
            );
        }
    },

    withdrawal: async (req, res, next) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { userID = null } = req.params;
            const { amount = null } = req.body;

            const { error } = AmountValidation.validate(amount);
            if (error || !objectIdValidation(userID)) {
                return next(
                    createHttpError(HTTPStatus.BAD_REQUEST, {
                        code: "INVALIDATE_FORMAT",
                        message: "Amount is invalidate",
                    })
                );
            }

            const referralRules = await ReferralRuleModel.findOne({});

            const referralUser = await ReferralUserModel.findOne({
                user: userID,
            });

            if (!referralUser) {
                return next(
                    createHttpError(HTTPStatus.NOT_FOUND, {
                        code: "USER_NOT_FOUND",
                        message: "User with this ID not found!",
                    })
                );
            }

            const lowerTimeAbsolute =
                new Date().toISOString().slice(0, 10) + "T00:00:00.000Z";

            const upperTime = new Date();
            upperTime.setDate(upperTime.getDate() + 1);
            const upperTimeAbsolute =
                upperTime.toISOString().slice(0, 10) + "T00:00:00.000Z";

            const todayWithdrawalQuantity =
                await ReferralWithdrawalModel.countDocuments({
                    referralUser: referralUser._id,
                    requestedAt: {
                        $gte: lowerTimeAbsolute,
                        $lt: upperTimeAbsolute,
                    },
                });

            if (todayWithdrawalQuantity >= referralRules.maxWithdrawalPerDay) {
                return res.json({
                    success: false,
                    message: "Withdrawal Request Limit is Reached!",
                });
            }

            // Check if any bank is attached to referral user
            if (referralUser.wallet.accounts.length === 0) {
                await session.abortTransaction();
                session.endSession();

                return res.json({
                    success: false,
                    message: "Add your bank account!",
                });
            }

            // Check if balance is less than requested amount
            if (referralUser.wallet.balance < Number(amount)) {
                await session.abortTransaction();
                session.endSession();

                return res.json({
                    success: false,
                    message: "Your balance is less than requested amount!",
                });
            }
            // Check if requested amount is less than min. withdrawal
            if (Number(amount) < referralRules.minWithdrawalAmount) {
                await session.abortTransaction();
                session.endSession();

                return res.json({
                    success: false,
                    message: `Request amount is less than min. withdrawal ${referralRules.minWithdrawalAmount}`,
                });
            }
            const primaryBank = referralUser.wallet.accounts.find(
                (account) => account.isPrimary
            );

            const newWithdrawal = await ReferralWithdrawalModel.insertOne({
                user: referralUser.user,
                referral_user: referralUser._id,
                amount: Number(amount),
                bank: {
                    name: primaryBank.bankName,
                    accountHolderName: primaryBank.accountHolderName,
                    accountNumber: primaryBank.accountNumber,
                    codeIFSC: primaryBank.codeIFSC,
                },
            });

            // Update referral user wallet
            referralUser.wallet.balance -= newWithdrawal.amount;
            referralUser.wallet.pendingWithdrawal += newWithdrawal.amount;
            referralUser.wallet.withdrawals.push(newWithdrawal._id);

            await referralUser.save();

            res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                success: true,
            });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();

            logger.error(
                `PATCH: withdrawal ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(HTTPStatus.SERVER_ERROR, {
                    code: "SERVER_ERROR",
                    message: "Internal Server Error",
                })
            );
        }
    },

    addBankAccount: async (req, res, next) => {
        try {
            const { userID } = req.params;
            const { bankName, accountHolderName, accountNumber, codeIFSC } =
                req.body;

            const { error } = BankValidation.validate(req.body);
            if (error) {
                return next(
                    createHttpError(HTTPStatus.BAD_REQUEST, {
                        code: "BAD_REQUEST",
                        message: "User doesn't exits with this ID",
                    })
                );
            }

            const referralUser = await ReferralUserModel.findOne({
                user: userID,
            });

            if (!referralUser) {
                return next(
                    createHttpError(HTTPStatus.BAD_REQUEST, {
                        code: "",
                        message: "User is not exists!",
                    })
                );
            }

            const isMatchAccountNo = referralUser.wallet.accounts.find(
                (account) => account.accountNumber === accountNumber
            );
            if (isMatchAccountNo) {
                return next(
                    createHttpError(HTTPStatus.BAD_REQUEST, {
                        code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
                        message: "Account already exists!",
                    })
                );
            }

            // Make this account primary if it is first account attached to referral user
            if (referralUser.wallet.accounts.length === 0) {
                referralUser.wallet.accounts.push({
                    bankName,
                    accountHolderName,
                    accountNumber,
                    codeIFSC,
                    isPrimary: true,
                });
            } else {
                referralUser.wallet.accounts.push({
                    bankName,
                    accountHolderName,
                    accountNumber,
                    codeIFSC,
                });
            }

            await referralUser.save();

            res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                success: true,
            });
        } catch (error) {
            logger.error(
                `POST: add-bank-account ${error.message}, Error stack: ${error.stack}`
            );

            next(
                createHttpError(HTTPStatus.SERVER_ERROR, {
                    code: "SERVER_ERROR",
                    message: "Internal Server Error",
                })
            );
        }
    },

    setBankAccountPrimary: async (req, res, next) => {
        try {
            const { userID } = req.params;
            const { bankAccountID } = req.query;

            const referralUser = await ReferralUserModel.findOne({
                user: userID,
            });

            if (!referralUser) {
                return next(
                    createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
                        code: ErrorCodes.RESOURCE_NOT_FOUND,
                        message: "User is not exists!",
                    })
                );
            }

            referralUser.wallet.accounts.forEach((account) => {
                account.isPrimary = account._id.equals(bankAccountID);
            });

            await referralUser.save();

            res.status(SuccessStatusCode.RESOURCE_UPDATED).json({
                success: true,
                message: "Bank account updated successfully",
            });
        } catch (error) {
            logger.error(
                `Failed to set bank account primary: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: error.message,
                })
            );
        }
    },

    isReferralCodeValid: async (req, res, next) => {
        try {
            const { userID, referralCode } = req.query;

            const validReferralCode = await ReferralUserModel.findOne({
                referralCode,
            });

            if (
                !validReferralCode ||
                validReferralCode.accountStatus === "deactive"
            ) {
                return res.json({
                    success: false,
                    message: "Invalid referral code.",
                });
            }

            if (validReferralCode.user.equals(userID)) {
                return res.json({
                    success: false,
                    message: "User cannot apply their own referral code.",
                });
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
