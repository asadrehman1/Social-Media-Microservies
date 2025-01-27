const logger = require('../utils/logger.js');
const Post = require('../models/post.model.js');
const { validateCreatePostData } = require('../utils/validation.js');
const redisClient = require('../utils/redisClient.js');
const { publishEvent } = require('../utils/rabbitmq.js');

const invalidateCachePost = async (postId) => {
    if (postId) {
        const cacheKey = `posts:${postId}`;
        await redisClient.del(cacheKey);
    }
    const keys = await redisClient.keys('posts:*');
    if (keys.length > 0) {
        await redisClient.del(keys);
    }
}

const createPost = async (req,res) => {
    logger.info('Hitting create post Endpoint');
    try {
        const { error } = validateCreatePostData(req.body);
        if (error) {
            logger.warn('Post Creation Error', error.details[0].message);
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            })
        }
        const { content, mediaIds } = req.body;
        const validMediaIds = Array.isArray(mediaIds) ? mediaIds : [];
        const newPost = await Post.create({
            userId: req.user.userId,
            content,
            mediaIds: validMediaIds,
        });
        await invalidateCachePost(newPost._id.toString());
        await publishEvent('post.created', {
            postId: newPost._id.toString(),
            userId: req.user.toString(),
            content: req.body.content,
            createdAt: newPost.createdAt
        })
        logger.info('Post created successfully', { postId: newPost._id });
        return res.status(201).json({
            success: true,
            message: 'Post created successfully',
        });
    } catch (error) {
        logger.error('Error creating post');
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        })
    }
}

const getAllPosts = async (req, res) => {
    logger.info('Hitting Get All Posts Endpoint');
    try {
        const pageNumber = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (pageNumber - 1) * limit;

        const cacheKey = `posts:${pageNumber}:${limit}`;
        const cachedPosts = await redisClient.get(cacheKey);

        if(cachedPosts){
            return res.status(200).json(JSON.parse(cachedPosts));
        }

        const posts = await Post.find().sort({createdAt: -1}).skip(skip).limit(limit);
        const totalPosts = await Post.countDocuments();
        if (!posts || posts.length === 0){
            logger.warn('No posts found');
            return res.status(400).json({
                success: false,
                message: 'No posts found'
            })
        }
        const result = {
            posts,
            currentPage: pageNumber,
            totalPages: Math.ceil(totalPosts / limit),
            totalPosts
        }
        await redisClient.setex(cacheKey, 300 ,JSON.stringify(result));
        logger.warn('Get all posts');
        return res.status(200).json(result);
    } catch (error) {
        logger.error('Error fetching posts');
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        })
    }
}

const getPost = async (req, res) => {
    logger.info('Hitting Get Single Post Endpoint');
    try {
        const cacheKey = `posts:${req.params.id}`;
        const cachedPost = await redisClient.get(cacheKey);

        if (cachedPost) {
            return res.status(200).json(JSON.parse(cachedPost));
        }
        const post = await Post.findById(req.params.id);
        if (!post) {
            logger.warn(`No post found with id:${req.params.id}`);
            return res.status(400).json({
                success: false,
                message: `No post found with id:${req.params.id}`
            })
        }
        await redisClient.setex(cacheKey, 3600, JSON.stringify(post));
        logger.warn('Got Single Post');
        return res.status(200).json(post);
    } catch (error) {
        logger.error('Error fetching post');
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        })
    }
}
const deletePost = async (req, res) => {
    logger.info('Hitting Delete Post Endpoint');
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId);

        if (!post) {
            logger.warn(`No post found with id:${postId}`);
            return res.status(400).json({
                success: false,
                message: `No post found with id:${postId}`
            });
        }
        const deletedPost = await Post.findByIdAndDelete(postId);
        await invalidateCachePost(postId);

        //publish deleting post method
        await publishEvent('post.deleted', {
            postId: deletedPost._id.toString(),
            userId: req.user.userId,
            mediaIds: deletedPost.mediaIds
        })

        await publishEvent('post.search-deleted', {
            postId: deletedPost._id.toString(),
        })

        logger.info(`Post deleted successfully`, { postId });
        return res.status(200).json({
            success: true,
            message: 'Post deleted successfully',
        });
    } catch (error) {
        logger.error('Error while  deleting post');
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        })
    }
}

module.exports = { createPost, getAllPosts, getPost, deletePost };