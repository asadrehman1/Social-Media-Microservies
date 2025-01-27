const Media = require("../models/media.model.js");
const { deleteMediaFromCloudinary } = require("../utils/cloudinary");

const handlePostDeleted = async(event) => {
    const {postId, mediaIds} = event;
    try {
        const mediaToDelete = await Media.find({_id: {$in: mediaIds}});
        for(const media of mediaToDelete){
            await deleteMediaFromCloudinary(media.publicId);
            await Media.findByIdAndDelete(media._id);
            logger.info('Delxeted Media from Cloudinary and DB associated with this post', media._id, postId);
        }
        logger.info(`Processed deletion of media for post: ${postId}`);

    } catch (error) {
        logger.error('Error occured while deleting media');
    }
}
module.exports = { handlePostDeleted };