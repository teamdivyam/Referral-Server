import mongoose from "mongoose";
import OrderModel from "../models/order.js";

mongoose
    .connect("mongodb://localhost:27017/development-referral-program")
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

let orderId = 0;

const products = [
    {productId: "PRD-18976", quantity: 15, price: 125000},
    {productId: "PRD-87212", quantity: 12, price: 175000},
    {productId: "PRD-29123", quantity: 20, price: 155000},
]

function Order() {
    orderId += 1;

    this.orderId = `ORD-${orderId}`;
    this.customer = "6837047d62b5d0740ae1ede9";
    this.booking = "6837047d62b5d0740ae1ede9";
    this.product = products[Math.floor(Math.random() * 3)];
    this.orderStatus = Math.random() > 0.5 ? "Completed" : "Refunded";
    this.totalAmount = this.product.price + Math.floor(this.product.price * 0.18);
}

async function SeedOrderDatabase() {
    try {
        const orders = [];

        for (let i = 0; i < 10; i++) {
            const newOrder = new Order();
            orders.push(newOrder);
        }

        await OrderModel.insertMany(orders);

        console.log("Seed successfully");
    } catch (error) {
        throw new Error(error);
    }
}

SeedOrderDatabase();
