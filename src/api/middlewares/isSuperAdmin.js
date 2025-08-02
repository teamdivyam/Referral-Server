import createHttpError from "http-errors";
import AdminModel from "../../db/models/AdminModel.js";
import { HTTPStatus, ROLES } from "../../utils/constant.js";

const isSuperAdmin = async (req, res, next) => {
    try {
        const admin = await AdminModel.findById(req.sessionInfo.adminId).select(
            "+role"
        );

        if (admin.role !== ROLES.SUPER_ADMIN) {
            return next(
                createHttpError(HTTPStatus.FORBIDDEN, {
                    message: "Access not permitted",
                })
            );
        }

        next();
    } catch (error) {
        return next(
            createHttpError(HTTPStatus.SERVER_ERROR, {
                code: "SERVER_ERROR",
                message: error.message,
            })
        );
    }
};

export default isSuperAdmin;
