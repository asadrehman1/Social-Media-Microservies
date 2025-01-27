const amqp = require('amqplib');
const logger = require('./logger.js');

let connection = null;
let channel = null;

const EXCHANGE_NAME = 'social_events';

async function connectToRabbitMQ() {
    try {
        connection = await amqp.connect(process.env.RABBITMQ_URL);
        channel = await connection.createChannel();

        channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: false});
        logger.info('Connected to rabbitmq');
        return channel;
    } catch (error) {
        logger.error('Error connecting to rabbitmq', error);
    }
}

async function publishEvent(routingKey, message) {
    if(!channel){
        await connectToRabbitMQ();
    }
    channel.publish(EXCHANGE_NAME, routingKey, Buffer.from(JSON.stringify(message)));
    logger.info(`Event Published: ${routingKey}`);
}
async function consumeEvent(routingKey, callback) {
    if (!channel) {
        await connectToRabbitMQ();
    }
    const q = channel.assertQueue('media_created_queue', { exclusive: true });
    await channel.bindQueue(q.queue, EXCHANGE_NAME, routingKey);
    channel.consume(q.queue, (msg) => {
        if (msg != null) {
            const content = JSON.parse(msg.content.toString());
            callback(content);
            channel.ack(msg);
        }
    })
    logger.info(`Subscribed to event: ${routingKey}`);
}

module.exports = { connectToRabbitMQ, publishEvent, consumeEvent };