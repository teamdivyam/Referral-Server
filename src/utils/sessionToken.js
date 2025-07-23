import jwt from "jsonwebtoken";

export const generateJwtToken = (payload, jwtSecret, jwtExpire) => {
    return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpire });
};

export const decodeJwtToken = (token, jwtSecret) => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, jwtSecret, (err, decoded) => {
            if (err) {
                reject(new Error("Token expired"));
            }
            resolve(decoded);
        });
    });
};
