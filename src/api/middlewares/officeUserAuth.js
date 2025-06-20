import { RoleTypes } from "../../db/models/role.model.js";
import { decodeJwtToken } from "../../utils/jwt.js";

const JWT_SECRET = process.env.JWT_SECRET;
const ALLOWED_ROUTES = ["/", "/auth/signup", "/auth/login"];

const isAuthorizedRoute = (currentRoute) => {
    return ALLOWED_ROUTES.some(route => currentRoute === route);
};

const ROUTES_ACL = {
    '/api/referral/admin': [RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN],
}

export const officeUserAuthMiddleware = async (req, res, next) => {
    let routeName = "";

    if (req.originalUrl) {
        routeName = req.originalUrl;
    } else {
        return res.status(401).json({ message: "Unauthorized access"});
    }

    if (isAuthorizedRoute(routeName)) {
        return next();
    }

    const token = req.headers["authorization"];

    if (token) {
        try {
            const decoded = await decodeJwtToken(token.replace('Bearer', ''), JWT_SECRET);

            if (!decoded?._id) {
                return res.status(401).json({ message: "Unauthorized access"});
            }

            req.user = decoded;

            return next();
        } catch (error) {
            console.error(err);
        }
    }
}