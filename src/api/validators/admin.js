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
    pageSize: Joi.number().min(1),
    search: Joi.string().trim(),
    searchFor: Joi.string().valid("name", "phone", "email"),
    sortBy: Joi.string().trim(),
    sortDir: Joi.string().valid("asc", "desc"),
});

export const passwordChangeSchema = Joi.object({
  currentPassword: Joi.string()
    .min(8)
    .required()
    .messages({
      'string.empty': 'Current password is required',
      'string.min': 'Current password must be at least 8 characters long',
    }),
    
  newPassword: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
    .required()
    .invalid(Joi.ref('currentPassword'))
    .messages({
      'string.empty': 'New password is required',
      'string.min': 'New password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.invalid': 'New password must be different from current password'
    }),
    
  confirmPassword: Joi.string()
    .required()
    .valid(Joi.ref('newPassword'))
    .messages({
      'string.empty': 'Please confirm your new password',
      'any.only': 'Passwords do not match'
    })
}).with('newPassword', 'confirmPassword');

