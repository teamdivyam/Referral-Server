import app from "./app.js";
import connectDB from "./config/database.js";
import { PORT} from "./utils/constant.js";

connectDB();

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});