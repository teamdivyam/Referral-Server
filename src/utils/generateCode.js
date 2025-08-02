import { customAlphabet } from "nanoid";
import { checkCodeInDatabase } from "../api/service/referral.js";
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const generateCode = customAlphabet(alphabet, 6);

async function createUniqueReferralCode(maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateCode();
    const exists = await checkCodeInDatabase(code); // Your DB check function
    
    if (!exists) {
      return code;
    }
  }
  throw new Error('Failed to generate unique code after retries');
}

export default createUniqueReferralCode;