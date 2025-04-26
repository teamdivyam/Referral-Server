import app from "./app.js";
import connectDB from "./config/database.js";
import logger from "../logs/index.js";
import { PORT} from "./utils/constant.js";

connectDB();

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});