const SearchPost = require("../models/search.model");
const redisClient = require('../utils/redisClient.js');

const searchPosts = async (req, res) => {
    logger.info('Hitting Search Posts Endpoint');
    try {
        const { query } = req.query;
        if (!query || query.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Query parameter is required',
            });
        }
        const cacheKey = `search:posts:${query}`;
        const cachedPosts = await redisClient.get(cacheKey);

        if (cachedPosts) {
            return res.status(200).json(JSON.parse(cachedPosts));
        }

        const searchedPosts = await SearchPost.find({$text: {$search: query}},{score: {$meta: 'textScore'}}).sort({ score: {$meta: 'textScore'} }).limit(10);
        if (!searchedPosts || searchedPosts.length === 0) {
            logger.warn('No posts found');
            return res.status(200).json({
                success: true,
                data: []
            });
        }
        await redisClient.setex(cacheKey, 300, JSON.stringify(searchedPosts));
        logger.warn('Get searched posts');
        return res.status(200).json(searchedPosts);
    } catch (error) {
        logger.error('Error while searching posts');
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        })
    }
}

module.exports = { searchPosts };