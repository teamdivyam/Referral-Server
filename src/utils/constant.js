import { config } from "dotenv";
config();

export const PORT = process.env.PORT;
export const MONGO_URI = process.env.MONGODB_URI;

export const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET;
export const ACCESS_TOKEN_EXPIRES = process.env.JWT_EXPIRES_IN;
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
export const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES_IN;

export const HASH_SALT_ROUNDS = 10;

export const MINIMUM_WITHDRAWAL_AMOUNT = 100;

export const REWARD_AMOUNT = 2500;

export const NOTIFICATION_PER_PAGE = 15;

// export const EXPIRATION_DATE_ON_REFERRAL =

export const SuccessCodes = {
    // Authentication success
    AUTH_LOGGED_IN: "AUTH_LOGGED_IN",
    AUTH_REGISTERED: "AUTH_REGISTERED",
    AUTH_PASSWORD_RESET: "AUTH_PASSWORD_RESET",

    // Resource success
    RESOURCE_CREATED: "RESOURCE_CREATED",
    RESOURCE_UPDATED: "RESOURCE_UPDATED",
    RESOURCE_DELETED: "RESOURCE_DELETED",

    // General success
    OPERATION_SUCCESSFUL: "OPERATION_SUCCESSFUL",
};

export const SuccessStatusCode = {
    // 200 OK
    AUTH_LOGGED_IN: 200,
    AUTH_PASSWORD_RESET: 200,
    RESOURCE_UPDATED: 200,
    OPERATION_SUCCESSFUL: 200,

    // 201 Created
    AUTH_REGISTERED: 201,
    RESOURCE_CREATED: 201,

    // 204 No Content (for successful deletion)
    RESOURCE_DELETED: 204,
};

export const ErrorCodes = {
    // Authentication errors
    AUTH_REQUIRED: "AUTH_REQUIRED",
    AUTH_TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",
    AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",

    INSUFFECIENT_BALANCE: "INSUFFECIENT_BALANCE",

    // Resource errors
    RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
    RESOURCE_ALREADY_EXISTS: "RESOURCE_ALREADY_EXISTS",

    // Input validation
    VALIDATION_REQUIRED_FIELD: "VALIDATION_REQUIRED_FIELD",
    VALIDATION_INVALID_FORMAT: "VALIDATION_INVALID_FORMAT",

    // Server errors
    SERVER_DATABASE_ERROR: "SERVER_DATABASE_ERROR",
    SERVER_DEPENDENCY_TIMEOUT: "SERVER_DEPENDENCY_TIMEOUT",
};

export const ErrorStatusCode = {
    // 400 Bad Request
    VALIDATION_REQUIRED_FIELD: 400,
    VALIDATION_INVALID_FORMAT: 400,

    // 401 Unauthorized
    AUTH_REQUIRED: 401,
    AUTH_TOKEN_EXPIRED: 401,
    AUTH_INVALID_CREDENTIALS: 401,

    // 403 Forbidden
    AUTH_INSUFFICIENT_PERMISSIONS: 403,
    INSUFFECIENT_BALANCE: 403,

    // 404 Not Found
    RESOURCE_NOT_FOUND: 404,

    // 409 Conflict
    RESOURCE_ALREADY_EXISTS: 409,

    // Default to 500 for server errors
    SERVER_DATABASE_ERROR: 500,
    SERVER_DEPENDENCY_TIMEOUT: 500,
};

export const HTTPStatus = {
    SUCCESS: 200,           // GET/PUT/PATCH success
    RESOURCES_CREATED: 201, // POST success
    NO_CONTENT: 204,        // DELETE success
    BAD_REQUEST: 400,       // Invalid input
    UNAUTHORIZED: 401,      // Unauthenticated
    FORBIDDEN: 403,         // Unauthorized
    NOT_FOUND: 404,         // Invalid URL
    TOO_MANY_REQUESTS: 429, // API throttling
    SERVER_ERROR: 500,       // Backend failure
};

export const ROLES = {
    ADMIN: 'admin',
    SUPPORT: 'support',
};

