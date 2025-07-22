import joi from "joi";

export const registerSchema = joi.object({
    email: joi
        .string()
        .email({ tlds: { allow: false } })
        .required()
        .messages({
            "string.email": "Email must be a valid email address",
            "any.required": "Email is required",
        }),
    role: joi.string().valid("admin", "support").required().messages({
        "any.only": "Role must be either admin or support",
        "any.required": "Role is required",
    }),
    password: joi
        .string()
        .min(8)
        .required()
        .pattern(
            new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$")
        )
        .messages({
            "string.min": "Password must be at least 8 characters long",
            "string.pattern.base":
                "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character",
            "any.required": "Password is required",
        }),
    confirmPassword: joi
        .string()
        .valid(joi.ref("password"))
        .required()
        .label("Confirm Password")
        .messages({
            "any.only": "Confirm password must match password",
            "any.required": "Confirm password is required",
        }),
});

export const loginSchema = joi.object({
    email: joi
        .string()
        .email({ tlds: { allow: false } })
        .required()
        .messages({
            "string.email": "Email must be a valid email address",
            "any.required": "Email is required",
        }),
    password: joi.string().required().messages({
        "any.required": "Password is required",
    }),
});
