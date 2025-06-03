import Joi from "joi";

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
  codeIFSC: Joi.string().required(),
});