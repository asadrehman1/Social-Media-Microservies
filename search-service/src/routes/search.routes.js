const express = require('express');
const { searchPosts } = require('../controllers/search.controller.js');
const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis')
const { verifyToken } = require('../middleware/verifyToken.js');
const router = express.Router();
const redisClient = require('../utils/redisClient.js');

const searchPostsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 50,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many search requests. Please try again later.',
        });
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    }),
});

router.get('/', verifyToken, searchPostsLimiter ,searchPosts);
module.exports = router;