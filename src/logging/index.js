import devLogger from "./devLogger.js";
import uatLogger from "./uatLogger.js";
import productionLogger from "./productionLogger.js";

let logger = null;

if (process.env.NODE_ENV === "production") {
    logger = productionLogger();
}

if (process.env.NODE_ENV === "uat") {
    logger = uatLogger();
}

if (process.env.NODE_ENV === "development") {
    logger = devLogger();
}

export default logger;
