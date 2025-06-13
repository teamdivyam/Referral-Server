// // import mongoose from "mongoose";

// // const TransactionSchema = new mongoose.Schema(
// //     {
// //         transactionId: { type: String, required: true, unique: true },
// //         withdrawalId: {
// //             type: mongoose.Schema.Types.ObjectId,
// //             ref: "referralwithdrawal",
// //             required: true,
// //             unique: true,
// //         },
// //         amount: { type: Number, required: true },
// //         date: { type: Date, required: true },
// //     },
// //     {
// //         timestamps: true,
// //         versionKey: false,
// //     }
// // );

// // const TransactionModel = mongoose.model(
// //     "referraltransaction",
// //     TransactionSchema
// // );

// // export default TransactionModel;

// import mongoose from "mongoose"

// const payoutTransactionSchema = new mongoose.Schema({
//     user: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User",
//         required: true,
//     },
//     referral: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User",
//         required: true,
//     },
//     amount: {
//         type: Number,
//         required: true,
//         min: 1,
//     },
//     status: {
//         type: String,
//         enum: ["pending", "approved", "rejected", "paid"],
//         default: "pending",
//     },
//     method: {
//         type: String,
//         enum: ["bank", "upi", "manual"],
//         default: "manual",
//     },
//     requestedAt: {
//         type: Date,
//         default: Date.now,
//     },
//     processedAt: {
//         type: Date,
//     },
//     note: {
//         type: String,
//     },
//     transactionId: {
//         type: String,
//         default: null,
//     },
//     createdBy: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Admin",
//         required: false, // if you want to track the admin who processed
//     },
// });

// module.exports = mongoose.model("PayoutTransaction", payoutTransactionSchema);
