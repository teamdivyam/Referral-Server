import mongoose from "mongoose";
import OrderModel from "../models/order.js";

mongoose
    .connect("mongodb://localhost:27017/development-referral-program")
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));


const QUANTITY = 10;

const orders = [];

for (let i = 0; i < QUANTITY; i++) {
  orders.push({
    orderId: `ord-${i + 1}`,
    customer: `67e799c7b91f88d82f8f28e${i}`,
    product: {
      productId: "123",
      quantity: Math.floor(Math.random() * 10),
      price: 20000,
    },
    orderStatus: Math.random() > 0.5 ? "Completed" : "Refunded",
    payment: {
      status: "Paid",
      method: "upi",
    },
    totalAmount: 20000,
  });
}

async function SeedOrderInDB() {
  try {
    // Clear existing data
    await OrderModel.deleteMany({});
    console.log("Database cleared");

    await OrderModel.insertMany(orders);
    console.log("Database seeded successfully");
  } catch (error) {
    console.log("Error in seeding database:", error);
  } finally {
    mongoose.connection.close();
  }
}

SeedOrderInDB();

