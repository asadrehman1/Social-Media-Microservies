const express = require('express');
const multer = require('multer');

const { uploadMedia } = require('../controllers/media.controller.js');
const { verifyToken } = require('../middleware/verifyToken.js');
const logger = require('../utils/logger.js');

const router = express.Router();

//multer configuration
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    }
}).single('file');

router.post('/upload', verifyToken, (req,res,next) => {
    upload(req,res,function(err){
        if(err instanceof multer.MulterError){
            logger.error('Multer error while uploading media', err);
            return res.status(400).json({
                message: 'Multer error while uploading media',
                 error: err.message,
                stack: err.stack
            })
        }
        else if(err){
            logger.error('Unknown error occured while uploading media', err);
            return res.status(500).json({
                message: 'Unknown error occured while uploading media',
                error: err.message,
                stack: err.stack
            })
        }
        next();
    })
}, uploadMedia);

module.exports = router;