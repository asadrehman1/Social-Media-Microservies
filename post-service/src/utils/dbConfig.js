const mongoose = require('mongoose');
const logger = require("../utils/logger.js");

const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        logger.info('Connected to MongoDB');
    } catch (err) {
        logger.error('MongoDB connection error', err);
        process.exit(1);
    }
}

module.exports = connectDb;