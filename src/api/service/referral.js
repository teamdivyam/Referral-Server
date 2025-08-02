import ReferralUserModel from "../../db/models/ReferralUserModel.js";

export const checkCodeInDatabase = async (referralCode) => {
    // Return true if referral code preexists
    return ReferralUserModel.findOne({ referralCode });
};