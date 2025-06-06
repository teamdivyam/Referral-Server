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
            }).populate("user wallet.withdrawals");

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
            const { referralCode, refereeId, orderId, amount } = req.query;

            const referralUser = await ReferralUserModelV1.findOne({
                referralCode,
            });

            if (!referralUser || referralUser.accountStatus === "deactive") {
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
                amount: Number(amount),
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

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { userID = null } = req.params;
            const { amount = null } = req.body;

            const { error } = AmountValidation.validate(amount);
            if (error || !objectIdValidation(userID)) {
                return next(
                    createHttpError(ErrorStatusCode.VALIDATION_INVALID_FORMAT, {
                        code: ErrorCodes.VALIDATION_INVALID_FORMAT,
                        message: "Invalidation error",
                    })
                );
            }

            const referralUser = await ReferralUserModelV1.findOne({
                user: userID,
            });

            if (!referralUser) {
                return next(
                    createHttpError(ErrorStatusCode.RESOURCE_NOT_FOUND, {
                        code: ErrorCodes.RESOURCE_NOT_FOUND,
                        message: "User with this ID not found!",
                    })
                );
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
            if (Number(amount) < MIN_WITHDRAWAL_AMOUNT) {
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

            const newWithdrawal = await ReferralWithdrawalModel.insertOne({
                referralUserId: referralUser._id,
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
                return next(
                    createHttpError(ErrorStatusCode.VALIDATION_INVALID_FORMAT, {
                        code: ErrorCodes.VALIDATION_INVALID_FORMAT,
                        message: "Validation error",
                    })
                );
            }

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

            const isMatchAccountNo = referralUser.wallet.accounts.find(
                (account) => account.accountNumber === accountNumber
            );
            if (isMatchAccountNo) {
                return next(
                    createHttpError(ErrorStatusCode.RESOURCE_ALREADY_EXISTS, {
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

    async setBankAccountPrimary(req, res, next) {
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
