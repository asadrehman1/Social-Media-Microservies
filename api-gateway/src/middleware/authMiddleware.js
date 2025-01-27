const logger = require("../utils/logger.js");
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res , next) => {
    const authHeader = req.headers['authorization'];
    const token =  authHeader && authHeader.split(" ")[1];
    if(!token){
        logger.warn('Access attempted without access token');
        return res.status(401).json({
            success: false,
            message: 'Access attempted without access token'
        })
    }
    jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET, (err, user) => {
        if(err){
            logger.warn('Invalid Token');
            return res.status(429).json({
                success: false,
                message: 'Invalid Token'
            })
        }
        req.user = user;
        next();
    })
}

module.exports = { authMiddleware };