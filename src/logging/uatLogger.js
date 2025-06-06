import { createLogger, format, transports } from "winston";

const { combine, timestamp, label, printf } = format;

const myFormat = printf(({level, message, label, timestamp}) => {
    return `${timestamp} ${label} [${level}]: ${message}`;
});

const uatLogger = () => {
    return createLogger({
        level: "info",
        format: combine(
            format.colorize(),
            label({ label: "uat"}),
            timestamp({ format: "YYYY:MM:DD HH:mm:ss"}),
            myFormat
        ),
        transports: [
            new transports.File({ filename: "error.log", level: "error" }),
            new transports.File({ filename: "combined.log" }),
            new transports.Console()

        ]
    })
};


export default uatLogger;