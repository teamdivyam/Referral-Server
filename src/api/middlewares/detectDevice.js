import DeviceDetector from "device-detector-js";

export const detectDevice = (req, res, next) => {
    const userAgent = req.headers['user-agent'];
    const detector = new DeviceDetector();
    const device = detector.parse(userAgent);

    req.deviceInfo = {
        type: device.device?.type || "desktop",
        os: device.os?.name || "unkown",
        browser: device.client?.name || "unknown",
        ip: req.ip || req.connection.remoteAddress,
        userAgent,
    };

    next();
}