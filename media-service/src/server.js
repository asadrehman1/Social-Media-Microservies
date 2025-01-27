require('dotenv').config();
const express = require('express');
const connectDb = require('./utils/dbConfig.js');
const helmet = require('helmet');
const cors = require('cors');
const bodyParser = require("body-parser")
const logger = require('./utils/logger.js');
const mediaRoutes = require('./routes/media.routes.js');
const errorHandler = require('./middleware/errorHandler.js');
const { connectToRabbitMQ } = require('../../post-service/src/utils/rabbitmq.js');
const { consumeEvent } = require('./utils/rabbitmq.js');
const { handlePostDeleted } = require('./eventHandlers/media-event-handlers.js');

const app = express();
//connection to mongoDB
connectDb();
//middlewares
app.use(helmet()); // -> It sets various http headers to make app more secure from attacks like Xss
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use((req, res, next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request Body: ${req.body}`);
    next();
})

//Routes 
app.use('/api/media', mediaRoutes);

//Error Handler
app.use(errorHandler);

async function startServer() {
    try {
        await connectToRabbitMQ();
        //consume all the events
        await consumeEvent('post.deleted', handlePostDeleted);
        app.listen(process.env.PORT || 3003, () => {
            logger.info(`Server running on port ${process.env.PORT}`);
        });
    } catch (error) { 
        logger.error('Failed to connect to the server', error);
        process.exit(1);
    }
}

startServer();
//unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at', promise, 'reason:', reason);
})
