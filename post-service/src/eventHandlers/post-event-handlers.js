const Post = require('../models/post.model.js');

const handleMediaCreation = async (event) => {
    const { postId, mediaId } = event;
    try {
        const post = await Post.findById({_id: postId});
        post.mediaIds.push(mediaId);
        logger.info(`New Media has added for post: ${postId}`);

    } catch (error) {
        logger.error('Error occured while adding media');
    }
}
module.exports = { handleMediaCreation };