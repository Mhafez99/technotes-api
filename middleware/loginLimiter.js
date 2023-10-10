const rateLimit = require("express-rate-limit");
const {logEvents} = require("./logger");

const loginLimiter = rateLimit({
    window: 60 * 1000, // 1 Minute
    max: 5, // Limit each IP to 5 Login requests per 'window' per minute
    message: {
        message: "Too Many Login attempts from this IP ,Please Try again after 60 second pause"
    },
    handler: (req, res, next, options) => {
        logEvents(`Too Many Request ${options.message.message}\t${req.method}\t${req.url}\t${req.header.origin}`, "errLog.log");
        res.status(options.statusCode).send(options.message);
    },
    standardHeaders: true, // return rate Limit Info in the RateLimit-* headers
    legacyHeaders: false // Disable the X-ReteLimit-* headers
});

module.exports = loginLimiter;