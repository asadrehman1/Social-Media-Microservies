require('dotenv').config();
const express = require('express');
const connectDb = require('./utils/dbConfig.js');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('./utils/logger.js');
const postRoutes = require('./routes/post.routes.js')
const errorHandler = require('./middleware/errorHandler.js');
const { connectToRabbitMQ, consumeEvent } = require('./utils/rabbitmq.js');
const { handleMediaCreation } = require('./eventHandlers/post-event-handlers.js');

const app = express();
//connection to mongoDB
connectDb();
//middlewares
app.use(helmet()); // -> It sets various http headers to make app more secure from attacks like Xss
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request Body: ${req.body}`);
    next();
})

//Routes 
app.use('/api/posts', postRoutes);

//Error Handler

app.use(errorHandler);

async function startServer(){
    try {
        await connectToRabbitMQ();
        await consumeEvent('media.created', handleMediaCreation);
        app.listen(process.env.PORT || 3002, () => {
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
