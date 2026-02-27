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

async function subscribe(serviceName, routingKey, handler, options = {}) {
  const MAX_RETRIES = options.maxRetries || 3;
  const RETRY_TTL = options.retryTtl || 10000; // 10s delay giữa các lần retry

  try {
    if (!channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    const queueName = `${serviceName}.${routingKey}`;
    const retryQueueName = `${queueName}.retry`;
    const dlqName = `${queueName}.dlq`;

    // 1. Final DLQ — message chết hẳn, chờ dev xử lý thủ công
    await channel.assertQueue(dlqName, { durable: true });

    // 2. Retry Queue — không có consumer, chỉ giữ message TTL giây
    //    Khi TTL hết → dead-letter quay về events exchange → main queue
    await channel.assertQueue(retryQueueName, {
      durable: true,
      arguments: {
        'x-message-ttl': RETRY_TTL, // 10s delay giữa các lần retry
        'x-dead-letter-exchange': EXCHANGE_NAME, // Quay về events exchange
        'x-dead-letter-routing-key': routingKey, // Quay về main queue
      },
    });

    // 3. Main Queue — consumer xử lý ở đây
    //    Khi nack(requeue=false) → dead-letter vào retry queue
    await channel.assertQueue(queueName, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '', // Không quay lại events exchange
        'x-dead-letter-routing-key': retryQueueName, // Quay về retry queue
      },
    });

    await channel.bindQueue(queueName, EXCHANGE_NAME, routingKey); // Bind queue với exchange và routing key nghĩa là queue sẽ nhận message từ exchange với routing key để so sánh routing key để đưa vào queue
    await channel.prefetch(1); // Chỉ xử lý 1 message tại thời điểm

    channel.consume(queueName, async (msg) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString()); // chuyển dạng nhị phân thành string rồi chuyển qua dạng json 
        logger.info(`Event received: ${routingKey}`, { queue: queueName });
        await handler(content); // là việc service lấy message trong queue ra để xử lý
        channel.ack(msg); // ack là sẽ xoá message trong queue nghĩa là service đã làm rồi hãy xoá message trong queue đi
      } catch (err) {
        logger.error(`Error processing event ${routingKey}:`, err.message);

        // RabbitMQ tự thêm x-death header mỗi lần dead-letter
        // Phải lọc đúng record: rejected ở main queue (không phải expired ở retry queue)
        const deaths = msg.properties.headers?.['x-death'] || []; // coi là header của message có phải là x-death không
        const mainReject = deaths.find(d => d.queue === queueName && d.reason === 'rejected'); // tìm record rejected ở main queue
        const retryCount = mainReject?.count || 0; // đếm số lần retry

        if (retryCount >= MAX_RETRIES) { // nếu quá số lần retry thì gửi vào Final DLQ rồi mới ack (tránh mất message)
          channel.sendToQueue(dlqName, msg.content, {
            persistent: true,
            contentType: msg.properties.contentType || 'application/json',
            contentEncoding: msg.properties.contentEncoding,
            headers: msg.properties.headers,
          });
          channel.ack(msg);
          logger.error(`Event ${routingKey} sent to DLQ after ${retryCount} retries`);
        } else {
          // nack → dead-letter → retry queue (chờ TTL) → quay lại main queue
          channel.nack(msg, false, false);
          logger.warn(`Retrying event ${routingKey} in ${RETRY_TTL / 1000}s (attempt ${retryCount + 1}/${MAX_RETRIES})`);
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
