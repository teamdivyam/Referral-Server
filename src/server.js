import app from "./app.js";
import connectDB from "./config/database.js";
import logger from "./logging/index.js";
import { PORT} from "./utils/constant.js";

connectDB();

// App Server Instance Running on Port: 3000
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});