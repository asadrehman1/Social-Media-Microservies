require('dotenv').config();
const express = require('express');
const connectDb = require('./utils/dbConfig.js');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('./utils/logger.js');
const searchPostsRoutes = require('./routes/search.routes.js');
const errorHandler = require('./middleware/errorHandler.js');
const { connectToRabbitMQ, consumeEvent } = require('./utils/rabbitmq.js');
const { handleSearchPosts, handleSearchDeletedPost } = require('./eventHandlers/search-event-handler.js');

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
app.use('/api/search-posts', searchPostsRoutes);

//Error Handler

app.use(errorHandler);

async function startServer() {
    try {
        await connectToRabbitMQ();
        await consumeEvent('post.created', handleSearchPosts);
        await consumeEvent('post.search-deleted', handleSearchDeletedPost);
        
        app.listen(process.env.PORT || 3004, () => {
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
