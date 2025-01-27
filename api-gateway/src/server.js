require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const logger = require("./utils/logger.js");
const proxy = require('express-http-proxy');
const errorHandler = require('./middleware/errorHandler.js');
const { authMiddleware } = require('./middleware/authMiddleware.js');

const app = express();
const PORT = process.env.PORT || 3000;

const redisClient = new Redis(process.env.REDIS_URL);

//middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request Body: ${req.body}`);
    next();
})
const proxyOptions = {
    proxyReqPathResolver: (req) => {
        return req.originalUrl.replace(/^\/v1/,"/api") //replace v1 with api
    },
    proxyErrorHandler: (err, res, next) => {
        logger.error(`Proxy error: ${err.message}`);
        res.status(500).json({
            message: `Internal Server Error`,
            error: err.message
        })
    }
}

// setting up proxy for identity service
app.use('/v1/auth', proxy(process.env.IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        // you can update headers
        proxyReqOpts.headers['Content-Type'] = 'application/json';
        return proxyReqOpts;
    },
    // use it to modify the response before sending it to the user
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
        logger.info(`Response recevied from the identity service: ${proxyRes.statusCode}`);
        return proxyResData;
    }
}))

// setting up proxy for post service
app.use('/v1/posts', authMiddleware, proxy(process.env.POST_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        // you can update headers
        proxyReqOpts.headers['Content-Type'] = 'application/json';
        proxyReqOpts.headers['x-user-id'] = srcReq.user.userId;
        return proxyReqOpts;
    },
    // use it to modify the response before sending it to the user
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
        logger.info(`Response recevied from the post service: ${proxyRes.statusCode}`);
        return proxyResData;
    },
    parseReqBody: false
}))

// setting up proxy for media service
app.use('/v1/media', authMiddleware, proxy(process.env.MEDIA_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        // you can update headers
        proxyReqOpts.headers['x-user-id'] = srcReq.user.userId;
        if (!srcReq.headers['content-type'].startsWith('multipart/form-data')) {
            proxyReqOpts.headers['Content-Type'] = 'application/json';
        }
        return proxyReqOpts;
    },
    // use it to modify the response before sending it to the user
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
        logger.info(`Response recevied from the media service: ${proxyRes.statusCode}`);
        return proxyResData;
    }
}))

// setting up proxy for search service
app.use('/v1/search-posts', authMiddleware, proxy(process.env.SEARCH_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        // you can update headers
        proxyReqOpts.headers['Content-Type'] = 'application/json';
        proxyReqOpts.headers['x-user-id'] = srcReq.user.userId;
        return proxyReqOpts;
    },
    // use it to modify the response before sending it to the user
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
        logger.info(`Response recevied from the search service: ${proxyRes.statusCode}`);
        return proxyResData;
    }
}))

//rate limiting
const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true, // want to include the rate limit info in the response also it allows client to see how many requests he has left in the given time period
    legacyHeaders: false,
    handler: (req,res) => {
        logger.warn(`Sensitive endpoint rate limit has exceeded for ip ${req.ip}`);
        res.status(429).json({
            success: false,
            message: 'Too many Requests, try again later'
        })
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    }),
})
app.use(rateLimiter);

//Error Handler

app.use(errorHandler);

app.listen(PORT, () => {
    logger.info(`API Gateway service is running on port ${PORT}`);
    logger.info(`Identity service is running on port ${process.env.IDENTITY_SERVICE_URL }`);
    logger.info(`Post service is running on port ${process.env.POST_SERVICE_URL}`);
    logger.info(`Media service is running on port ${process.env.MEDIA_SERVICE_URL}`);
    logger.info(`Search service is running on port ${process.env.SEARCH_SERVICE_URL}`);
});