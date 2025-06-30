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
import WithdrawalModel from "../../db/models/ReferralWithdrawalV1.js";
import mongoose from "mongoose";
import {
    AmountValidation,
    BankValidation,
    objectIdValidation,
} from "../validators/referral.js";
import ReferralRuleModel from "../../db/models/ReferralRules.js";

const referralController = {
    createReferralUser: async (req, res, next) => {
        try {
            const { userID } = req.params;

            const user = await UserModel.findById(userID);

            if (!user) {
                return res.json({
                    success: false,
                    message: "User doesn't exits with this ID",
                });
            }
            if (user.refer.isReferrer) {
                return res.json({
                    success: false,
                    message: "User already have a referral code",
                });
            }

            const referralCode = generateReferralCode();

            const newReferralUser = await ReferralUserModelV1.insertOne({
                user: userID,
                referralCode,
            });

            console.log(newReferralUser);

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
            }).populate("user wallet.withdrawals");

            if (!user) {
                // return next(
                //     createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
                //         code: ErrorCodes.RESOURCE_NOT_FOUND,
                //         message:
                //             "User is not registered for refer & earn program!",
                //     })
                // );
                return res.json({
                    success: false,
                    message: "User doesn't exits with this ID",
                });
            }

            res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                success: true,
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

    userReferral: async (req, res, next) => {
        try {
            const { userID } = req.params;

            const referral = await ReferralUserModelV1.find({ user: userID })
                .select("referralCode referralEvents")
                .populate({
                    path: "referralEvents",
                    select: "status amount createdAt updatedAt",
                });

            if (!referral) {
                return res.json({
                    success: false,
                    message: "User doesn't exists with this ID!",
                });
            }

            res.json({
                success: true,
                referral,
            });
        } catch (error) {
            logger.error(
                `Error in finding user referral: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    },

    userWallet: async (req, res, next) => {
        try {
            const { userID } = req.params;

            const user = await ReferralUserModelV1.findOne({
                user: userID,
            })
                .select("wallet")
                .populate({
                    path: "wallet.withdrawals",
                    options: { sort: { updatedAt: -1 } },
                });

            if (!user) {
                // return next(
                //     createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
                //         code: ErrorCodes.RESOURCE_NOT_FOUND,
                //         message:
                //             "User is not registered for refer & earn program!",
                //     })
                // );
                return res.json({
                    success: false,
                    message: "User doesn't exits with this ID",
                });
            }

            res.status(SuccessStatusCode.OPERATION_SUCCESSFUL).json({
                wallet: user.wallet,
            });
        } catch (error) {
            logger.error(
                `Error in retreiving wallet: ${error.message}, Error stack: ${error.stack}`
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
            const { referralCode, refereeId, orderId, amount } = req.query;

            const referralUser = await ReferralUserModelV1.findOne({
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
                amount: amount
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
        const MAX_WITHDRAWAL_LIMIT = 2;

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { userID = null } = req.params;
            const { amount = null } = req.body;

            const { error } = AmountValidation.validate(amount);
            if (error || !objectIdValidation(userID)) {
                // return next(
                //     createHttpError(ErrorStatusCode.VALIDATION_INVALID_FORMAT, {
                //         code: ErrorCodes.VALIDATION_INVALID_FORMAT,
                //         message: "Invalidation error",
                //     })
                // );
                return res.json({
                    success: false,
                    message: "Validation Error",
                });
            }

            const referralRules = await ReferralRuleModel.findOne({});

            const referralUser = await ReferralUserModelV1.findOne({
                user: userID,
            });

            if (!referralUser) {
                // return next(
                //     createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
                //         code: ErrorCodes.RESOURCE_NOT_FOUND,
                //         message: "User with this ID not found!",
                //     })
                // );
                return res.json({
                    success: false,
                    message: "User doesn't exits with this ID",
                });
            }

            const lowerTimeAbsolute =
                new Date().toISOString().slice(0, 10) + "T00:00:00.000Z";

            const upperTime = new Date();
            upperTime.setDate(upperTime.getDate() + 1);
            const upperTimeAbsolute =
                upperTime.toISOString().slice(0, 10) + "T00:00:00.000Z";

            const todayWithdrawalQuantity =
                await WithdrawalModel.countDocuments({
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
                    message: `Request amount is less than min. withdrawal ${MIN_WITHDRAWAL_AMOUNT}`,
                });
            }
            const primaryBank = referralUser.wallet.accounts.find(
                (account) => account.isPrimary
            );

            const newWithdrawal = await WithdrawalModel.insertOne({
                user: referralUser.user,
                referralUser: referralUser._id,
                amount: Number(amount),
                bank: {
                    name: primaryBank.bankName,
                    accountHolderName: primaryBank.accountHolderName,
                    accountNumber: primaryBank.accountNumber,
                    codeIFSC: primaryBank.codeIFSC,
                },
                requestedAt: new Date(),
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

    addBankAccount: async (req, res, next) => {
        try {
            const { userID } = req.params;
            const { bankName, accountHolderName, accountNumber, codeIFSC } =
                req.body;

            const { error } = BankValidation.validate(req.body);
            if (error) {
                // return next(
                //     createHttpError(ErrorStatusCode.VALIDATION_INVALID_FORMAT, {
                //         code: ErrorCodes.VALIDATION_INVALID_FORMAT,
                //         message: "Validation error",
                //     })
                // );
                return res.json({
                    success: false,
                    message: "Validation Error!",
                });
            }

            const referralUser = await ReferralUserModelV1.findOne({
                user: userID,
            });

            if (!referralUser) {
                // return next(
                //     createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
                //         code: ErrorCodes.RESOURCE_NOT_FOUND,
                //         message: "User is not exists!",
                //     })
                // );
                return res.json({
                    success: false,
                    message: "User doesn't exits with this ID",
                });
            }

            const isMatchAccountNo = referralUser.wallet.accounts.find(
                (account) => account.accountNumber === accountNumber
            );
            if (isMatchAccountNo) {
                // return next(
                //     createHttpError(ErrorStatusCode.RESOURCE_ALREADY_EXISTS, {
                //         code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
                //         message: "Account already exists!",
                //     })
                // );
                return res.json({
                    success: false,
                    message: "Account already exits",
                });
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
                `Error in adding bank account: ${error.message}, Error stack: ${error.stack}`
            );

            return next(
                createHttpError(ErrorStatusCode.SERVER_DATABASE_ERROR, {
                    code: ErrorCodes.SERVER_DATABASE_ERROR,
                    message: "Internal Server Error",
                })
            );
        }
    },

    setBankAccountPrimary: async (req, res, next) => {
        try {
            const { userID } = req.params;
            const { bankAccountID } = req.query;

            const referralUser = await ReferralUserModelV1.findOne({
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

            const validReferralCode = await ReferralUserModelV1.findOne({ referralCode });

            if (!validReferralCode || validReferralCode.accountStatus === "deactive") {
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
