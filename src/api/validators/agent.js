import Joi from "joi";

export const ProfileValidation = Joi.object({
  name: Joi.string().required(),
  phoneNumber: Joi.string()
    .regex(/^[0-9]{10}$/)
    .required()
    .messages({
      "string.base": "Phone number must me string",
      "string.empty": "Phone number is required",
      "string.pattern.base": "Phone number is invalid",
    }),
  addressLine1: Joi.string().required(),
  addressLine2: Joi.string().required(),
  city: Joi.string().required(),
  state: Joi.string().required(),
});


export const BankValidation = Joi.object({
  bankName: Joi.string().required(),
  accountHolderName: Joi.string().required(),
  accountNumber: Joi.string()
    .regex(/^\d{9,18}$/)
    .required()
    .messages({
      "string.base": "Account number must be string",
      "string.empty": "Account number is required",
      "string.pattern.base": "Account number is invalid",
    }),
  ifscCode: Joi.string().required(),
});
