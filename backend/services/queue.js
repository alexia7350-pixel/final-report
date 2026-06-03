const { Queue } = require('bullmq');
const Redis = require('ioredis');

// Initialize Redis connection
const connection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null, // Required by BullMQ
});

// Initialize Queue
const notificationQueue = new Queue('notificationQueue', { connection });

/**
 * Add a reminder task to the queue
 * @param {Object} jobData - Data to pass to the worker
 * @param {Date} scheduledTime - When the reminder should be sent
 */
const scheduleNotification = async (jobData, scheduledTime) => {
  const delay = scheduledTime.getTime() - Date.now();
  
  if (delay < 0) {
    console.warn('Scheduled time is in the past, sending immediately.');
  }

  return await notificationQueue.add('sendReminder', jobData, {
    delay: Math.max(delay, 0),
    removeOnComplete: true,
  });
};

module.exports = {
  notificationQueue,
  scheduleNotification,
  connection,
};
