const NotificationTemplate = {
  REFERRAL_CODE_ALLOTED(quantity) {
    return `You${'’'}ve been assigned ${quantity} referral codes. Start referring now!`;
  },
  TRACK_REFERRAL_CODE: {
    USED(code) {
      return `Someone used your referral code: ${code}!`;
    },
    REJECTED(code) {
      return `Your referral code: ${code} has been rejected!`;
    },
    REFUNDED(code) {
      return `Your referral code: ${code} customer has cancelled order.`
    }
  },
  WALLET: {
    DEPOSITED(amount) {
      return `Your wallet has been credited with ${amount}.`;
    },
    WITHDRAWAL_REQUESTED(amount) {
      return `Your withdrawal request of ${amount} has been submitted.`;
    },
    APPROVED(amount) {
      return `Your withdrawal request of ${amount} has been approved.`;
    },
  },
};

export default NotificationTemplate;
