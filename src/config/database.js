import mongoose from "mongoose";
import { MONGO_URI } from "../utils/constant.js";
import logger from "../../logs/index.js";

const connectDB = async () => {
  try {
    const db = await mongoose.connect(MONGO_URI);
    db.connection.db.admin().command({
      setParameter: 1,
      maxTransactionLockRequestTimeoutMillis: 3000
    })
    logger.info("Database connected successfully");
  } catch (error) {
    logger.error(`Database connection failed: ${error.message}`);
  } 
};

export default connectDB;