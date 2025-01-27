require('dotenv').config();
const express = require('express');
const connectDb = require('./utils/dbConfig.js');
const helmet = require('helmet');
const { configCors } = require('./utils/corsConfig.js');
const { RateLimiterRedis } = require("rate-limiter-flexible");
const Redis = require('ioredis');
const { rateLimit } = require('express-rate-limit'); 
const { RedisStore } = require('rate-limit-redis')
const logger = require('./utils/logger.js');
const identityRoutes = require('./routes/identity.routes.js');
const errorHandler = require('./middleware/errorHandler.js');

const app = express();
//connection to mongoDB
connectDb(); 
//redis connection
const redisClient = new Redis(process.env.REDIS_URL);
//middlewares
app.use(helmet()); // -> It sets various http headers to make app more secure from attacks like Xss
app.use(configCors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req,res,next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request Body: ${req.body}`);
    next();
})

//DDOS protection and rate limiting
const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient, // storeClient is an instance of redis client which stores rate limit data
    keyPrefix: 'middleware', // it will be added to redis keys for rate limiting which will differentiate the rate limiting data to other redis data.
    points: 10, // Number of requests a user can make in a given time
    duration: 5 // 5sec
})

app.use((req,res,next)=> {
    rateLimiter.consume(req.ip).then(() => next()).catch(err => {
        logger.warn(`Rate limit exceeded for ip ${req.ip}`);
        res.status(429).json({
            success: false,
            message: 'Too many Requests, try again later'
        })
    }); 
})

//IP based rate limiting for sensitive endpoints
const sensitiveEndPointsLimitter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
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

//Routes 

app.use('/api/auth/register', sensitiveEndPointsLimitter);
app.use('/api/auth', identityRoutes);

//Error Handler

app.use(errorHandler);

app.listen(process.env.PORT || 3001, () => {
    logger.info(`Server running on port ${process.env.PORT}`);
});

//unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at', promise, 'reason:', reason);
})