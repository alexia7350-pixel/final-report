const { Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const { connection } = require('./services/queue');
require('dotenv').config();

const prisma = new PrismaClient();

const worker = new Worker('notificationQueue', async (job) => {
  const { taskId, reminderId, userId } = job.data;
  
  console.log(`[Worker] Processing job for reminder: ${reminderId}`);

  try {
    // 檢查任務與提醒的當前狀態
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { user: true },
    });

    const reminder = await prisma.reminder.findUnique({
      where: { id: reminderId },
    });

    if (!task || !reminder) {
      console.log(`[Worker] Task or Reminder not found, skipping.`);
      return;
    }

    // 若任務已完成，或提醒已被取消，則不發送通知
    if (task.status === 'COMPLETED' || reminder.status !== 'PENDING') {
      console.log(`[Worker] Task is completed or reminder not pending, skipping notification.`);
      return;
    }

    // 實際發送通知的邏輯 (此處為模擬)
    console.log(`[Worker] Sending notification to user ${task.user.email} (Line: ${task.user.lineId}) for task: ${task.title}`);
    
    // TODO: 串接 LINE / Email API 進行實際發送

    // 更新提醒狀態為已發送
    await prisma.reminder.update({
      where: { id: reminderId },
      data: { status: 'SENT' },
    });

    console.log(`[Worker] Notification sent and reminder marked as SENT.`);

  } catch (error) {
    console.error(`[Worker] Error processing job:`, error);
    throw error;
  }
}, { connection });

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} has failed with ${err.message}`);
});

console.log('Worker is running and listening to notificationQueue...');
