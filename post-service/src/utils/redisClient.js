const Redis = require('ioredis');
const logger = require('../utils/logger.js');
//redis connection
const redisClient = new Redis(process.env.REDIS_URL);
redisClient.on('connect', () => {
    logger.info('Connected to Redis');
});

redisClient.on('error', (err) => {
    logger.error('Redis connection error:', err);
});

module.exports = redisClient;