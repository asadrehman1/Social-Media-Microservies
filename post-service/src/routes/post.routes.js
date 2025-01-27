const express = require('express');
const { createPost, getAllPosts, getPost, deletePost } = require('../controllers/post.controller');
const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis')
const { verifyToken } = require('../middleware/verifyToken.js');
const router = express.Router();
const redisClient  = require('../utils/redisClient.js');

const createPostsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many create post requests. Please try again later.',
        });
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    }),
});

const fetchPostsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 50,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many fetch requests. Please try again later.',
        });
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    }),
});

router.use(verifyToken);
router.post('/create-post', createPostsLimiter ,createPost);
router.get('/all-posts', fetchPostsLimiter ,getAllPosts);
router.get('/:id',getPost);
router.delete('/:id',deletePost);
module.exports = router;