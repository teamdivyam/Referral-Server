import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 1000 }
});

const CounterModel = mongoose.model("referralcounter", counterSchema);

export default CounterModel;