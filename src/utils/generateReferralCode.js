const generatedStrings = new Set();

function generateReferralCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomString = '';

  do {
    randomString = '';
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      randomString += characters[randomIndex];
    }
  } while (generatedStrings.has(randomString));

  generatedStrings.add(randomString);
  return randomString;
}

export default generateReferralCode;