const logger = require("../utils/logger.js");
const { validateRegisteration, validateLogin } = require("../utils/validation.js");
const User = require("../models/user.model.js");
const generateTokens = require("../utils/generateToken.js");
const RefreshToken = require("../models/refreshtoken.model.js");

const registerUser = async(req,res) => {
    logger.info('Hitting User Rigesteration Endpoint');
    try {
        const { error } = validateRegisteration(req.body);
        if(error){
            logger.warn('Validation error', error.details[0].message);
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            })
        }
        const { userName, email, password } = req.body;
        let user = await User.findOne({$or: [{email},{userName}]});
        if(user){
            logger.warn('User already exists');
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            })
        }
        user = new User({ userName, email, password });
        await user.save();
        logger.warn('User Saved Successfully', user._id);
        const {accessToken,refreshToken} = await generateTokens(user);
        return res.status(201).json({
            success: true,
            message: 'User registered Successfully!',
            accessToken,
            refreshToken
        })
    } catch (error) {
        logger.erro('Registeration Error Occured', e);
        return res.status(500).json({
            success: false,
            message: 'Internal Sever Error'
        })
    }
}

const loginUser = async (req,res) => {
    logger.info('Hitting User Login Endpoint');
    try {
        const { error } = validateLogin(req.body);
        if(error){
            logger.warn('Validation error', error.details[0].message);
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            })
        }
        const { email, password } = req.body;
        let user = await User.findOne({email});
        if(!user){
            logger.warn('User does not exist');
            return res.status(400).json({
                success: false,
                message: 'User does not exist'
            })
        }
        const isMatched = await user.comparePassword(password);
        if(!isMatched){
            logger.warn('Invalid Credentials');
            return res.status(400).json({
                success: false,
                message: 'Invalid Credentials'
            })
        }
        logger.warn('User Logged In Successfully', user._id);
        const {accessToken,refreshToken} = await generateTokens(user);
        return res.status(201).json({
            success: true,
            message: 'User Logged In Successfully!',
            accessToken,
            refreshToken
        })
    } catch (error) {
        logger.erro('LogIn Error Occured', e);
        return res.status(500).json({
            success: false,
            message: 'Internal Sever Error'
        })
    }
}

const logout = async (req,res) => {
    logger.info('Hitting logout Endpoint');
    try {
        const { refreshToken } = req.body;
        if(!refreshToken){
            logger.warn('Refresh token is missing');
            return res.status(400).json({
                success: false,
                message: 'Refresh token is missing'
            })
        }
        await RefreshToken.deleteOne({ token: refreshToken });
        logger.info('Refresh token deleted for logout');
        return res.status(200).json({
            success: true,
            message: 'Logged Out Successfully'
        })
    } catch (error) {
        logger.erro('logout Error Occured', e);
        return res.status(500).json({
            success: false,
            message: 'Internal Sever Error'
        })
    }
}

module.exports = { registerUser, loginUser, logout };