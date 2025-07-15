import Joi from "joi";
import mongoose from "mongoose";

export const validatePageLimitSearch = Joi.object({
    page: Joi.number(),
    limit: Joi.number(),
});

export const objectIdValidation = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

export const assingReferralCodeQuantity = Joi.number();

export const processWithdrawalValidation = Joi.object({
    processType: Joi.string().valid("approved", "rejected"),
    remarks: Joi.string().allow(null),
});

export const agentAccountStatus = Joi.string().valid(
    "activate",
    "deactivate"
);


export const ValidateMultipleUserQuery = Joi.object({
    page: Joi.number().min(1),
    pageSize: Joi.number().min(10),
    search: Joi.string().trim(),
    searchFor: Joi.string().valid("name", "phone", "email"),
    sortBy: Joi.string().trim(),
    sortDir: Joi.string().valid("asc", "desc"),
})
