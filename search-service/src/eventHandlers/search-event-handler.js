const SearchPost = require("../models/search.model.js");
const logger = require('../utils/logger.js');
const redisClient = require('../utils/redisClient.js');

const handleSearchPosts = async(event) => {
    const { postId, userId, content, createdAt } = event;
    try {
        const newSearchPost = new SearchPost({
            postId,
            userId,
            content,
            createdAt
        })
        await newSearchPost.save();
        const keys = await redisClient.keys('search:posts:*');
        if (keys.length > 0) {
            await redisClient.del(keys);
        }
        logger.info(`Search post created for: ${postId}`);
    } catch (error) {
        logger.error('Error occured while searching posts');
    }
}

const handleSearchDeletedPost = async (event) => {
    try {
        const keys = await redisClient.keys('search:posts:*');
        if (keys.length > 0) {
            await redisClient.del(keys);
        }
        await SearchPost.findOneAndDelete({ postId: event.postId });
        logger.info(`Search post deleted: ${event.postId}`);
    } catch (error) {
        logger.error('Error occured while deleting search post');
    }
}
module.exports = { handleSearchPosts, handleSearchDeletedPost };