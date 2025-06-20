import joi from "joi";

export const loginValidationSchema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().required()
});

export const registerValidationSchema = joi.object({
  email: joi.string().email().required(),
  password: joi.string().required(),
  confirmPassword: joi.ref('password')
});

export const officeUserAuth = joi.object({
    email: joi.string().email().required(),
    password: joi.string().required() 
})