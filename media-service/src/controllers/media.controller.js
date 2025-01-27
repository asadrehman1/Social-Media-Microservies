const logger = require('../utils/logger.js');
const { uploadMediaToCloudinary } = require('../utils/cloudinary.js');
const Media = require('../models/media.model.js');
const { publishEvent } = require('../utils/rabbitmq.js');

const uploadMedia = async (req,res) => {
    logger.info('Starting media upload');
    try {
        if(!req.file){
            logger.error('No file present. Please add a file and try again');
            return res.status(400).json({
                success: false,
                message: 'No file present. Please add a file and try again' 
            })
        }
        const { originalname, mimetype } = req.file;
        const userId = req.user.userId;

        logger.info(`File details: name=${originalname}, type=${mimetype}`);
        logger.info('Uploading to cloudinary starting...');
        console.log(req.file, 'FILE');
        const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);
        logger.info(`Cloudinary uploaded successfully. Public Id - ${cloudinaryUploadResult.public_id} `); 

        const newMedia = await Media({
            publicId: cloudinaryUploadResult.public_id,
            originalName: originalname,
            mimeType: mimetype,
            url: cloudinaryUploadResult.secure_url,
            userId
        })

        await newMedia.save();
        await publishEvent('media.created', {
            mediaId: newMedia._id,
            postId: newMedia.postId
        })
        return res.status(201).json({
            success: true,
            mediaId: newMedia._id,
            url: newMedia.url,
            message: 'Media Uploaded Successfully'
        })
    } catch (error) {
        logger.error('Error Uploading Media');
        return res.status(500).json({
            success: false,
            message: 'Error Uploading Media'
        })
    }
}
module.exports = { uploadMedia };