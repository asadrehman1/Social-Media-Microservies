const logger = require('../utils/logger.js');

const verifyToken = async(req,res,next) => {
    const userId = req.headers['x-user-id']; 
    if(!userId) {
        logger.warn('Access Attempted without userId');
        return res.status(401).json({
            success: false,
            message: 'Please login to continue'
        })
    }
    req.user = { userId };
    next();
}
module.exports = { verifyToken }; 