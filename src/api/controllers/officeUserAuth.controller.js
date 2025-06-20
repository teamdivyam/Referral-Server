import * as bcrypt from "bcryptjs";
import OfficeUser from "../../db/models/OfficeUser.js";
import { generateJwtToken } from "../../utils/jwt.js";
import { officeUserAuth } from "../validators/auth.js";
import { RoleModel, RoleTypes } from "../../db/models/role.model.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;

export const registerUser = async (req, res) => {
    const { email, password } = req.body;

    const { error } = officeUserAuth.validate({ email, password });
    if (error) {
        return res.status(422).json({
            message: "The field Email, Full Name and Password are required",
        });
    }

    const userExist = await OfficeUser.findOne({ email });
    if (userExist) {
        return res.status(409).json({
            message: "A user with this email already exists.",
        });
    }

    const role = await RoleModel.findOne({ name: RoleTypes.ADMIN });

    if (!role) {
        return res.status(500).json({ message: "Role not found" });
    }

    const userInput = {
        email,
        password: bcrypt.hashSync(password, 10),
        role: role._id
    };

    const userCreated = await OfficeUser.create(userInput);

    return res.status(201).json({ data: userCreated });
};

export const authenticateUser = async (req, res) => {
    const { email, password } = req.body;

    const user = await OfficeUser.findOne({ email });

    const { error } = officeUserAuth.validate({ email, password });
    if (error) {
        return res.status(400).json({
            message: "Email and Password is Invalid",
        });
    }

    const isMatch = bcrypt.compareSync(password, user.password);

    if (!isMatch) {
        return res
            .status(400)
            .json({ message: "Email or password is invalid" });
    }

    const tokenInfo = {
        _id: user._id,
        role: user.role.name,
    };

    const token = generateJwtToken(tokenInfo, JWT_SECRET, JWT_EXPIRES_IN);

    return res.json({ token, expiresIn: JWT_EXPIRES_IN });
};
