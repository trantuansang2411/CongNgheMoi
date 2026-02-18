const amqplib = require('amqplib');
const logger = require('../utils/logger');

let connection = null;
let channel = null;

const EXCHANGE_NAME = 'events';
const EXCHANGE_TYPE = 'topic';

async function connect(url) {
  try {
    connection = await amqplib.connect(url);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, { durable: true });
    logger.info('RabbitMQ connected successfully');

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed. Reconnecting in 5s...');
      setTimeout(() => connect(url), 5000);
    });

    connection.on('error', (err) => {
      logger.error('RabbitMQ connection error:', err.message);
    });

    return channel;
  } catch (err) {
    logger.error('RabbitMQ connection failed:', err.message);
    setTimeout(() => connect(url), 5000);
  }
}

async function publishEvent(routingKey, data) {
  try {
    if (!channel) {
      throw new Error('RabbitMQ channel not initialized');
    }
    const message = Buffer.from(JSON.stringify({
      event: routingKey,
      data,
      timestamp: new Date().toISOString(),
    }));
    channel.publish(EXCHANGE_NAME, routingKey, message, {
      persistent: true,
      contentType: 'application/json',
    });
    logger.info(`Event published: ${routingKey}`);
  } catch (err) {
    logger.error(`Failed to publish event ${routingKey}:`, err.message);
    throw err;
  }
}

async function subscribe(serviceName, routingKey, handler) {
  try {
    if (!channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    const queueName = `${serviceName}.${routingKey}`;
    const dlqName = `${queueName}.dlq`;

    // Dead Letter Queue
    await channel.assertQueue(dlqName, { durable: true });

    // Main queue with DLQ
    await channel.assertQueue(queueName, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': dlqName,
      },
    });

    await channel.bindQueue(queueName, EXCHANGE_NAME, routingKey);
    await channel.prefetch(1);

    channel.consume(queueName, async (msg) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString());
        logger.info(`Event received: ${routingKey}`, { queue: queueName });
        await handler(content);
        channel.ack(msg);
      } catch (err) {
        logger.error(`Error processing event ${routingKey}:`, err.message);
        // Reject and send to DLQ after 3 retries
        const retryCount = (msg.properties.headers && msg.properties.headers['x-retry-count']) || 0;
        if (retryCount < 3) {
          channel.nack(msg, false, true);
        } else {
          channel.nack(msg, false, false); // Send to DLQ
        }
      }
    });

    logger.info(`Subscribed to: ${routingKey} on queue: ${queueName}`);
  } catch (err) {
    logger.error(`Failed to subscribe to ${routingKey}:`, err.message);
    throw err;
  }
}

function getChannel() {
  return channel;
}

async function close() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    logger.info('RabbitMQ connection closed');
  } catch (err) {
    logger.error('Error closing RabbitMQ:', err.message);
  }
}

module.exports = {
  connect,
  publishEvent,
  subscribe,
  getChannel,
  close,
  EXCHANGE_NAME,
};
