const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { scheduleNotification } = require('../services/queue');

const prisma = new PrismaClient();

/**
 * ==========================================
 * 使用者模組 (Users)
 * ==========================================
 */

// 註冊/建立使用者
router.post('/users', async (req, res, next) => {
  try {
    const { email, name, lineId } = req.body;
    const user = await prisma.user.create({
      data: { email, name, lineId },
    });
    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    next(error);
  }
});

// 取得使用者基本資料
router.get('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ message: 'User details fetched', user });
  } catch (error) {
    next(error);
  }
});

/**
 * ==========================================
 * 任務模組 (Tasks)
 * ==========================================
 */

// 取得當前使用者的所有任務
router.get('/tasks', async (req, res, next) => {
  try {
    const { userId, status } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    const filter = { userId };
    if (status) {
      filter.status = status;
    }

    const tasks = await prisma.task.findMany({
      where: filter,
      orderBy: { dueDate: 'asc' }
    });
    res.status(200).json({ message: 'List of tasks fetched', tasks });
  } catch (error) {
    next(error);
  }
});

// 建立新任務與設定提醒
router.post('/tasks', async (req, res, next) => {
  try {
    const { userId, title, courseName, description, dueDate, priority, remindAt } = req.body;
    
    const result = await prisma.$transaction(async (tx) => {
      // 1. 建立新任務
      const task = await tx.task.create({
        data: {
          userId,
          title,
          courseName,
          description,
          dueDate: new Date(dueDate),
          priority: priority || 'MEDIUM',
        }
      });

      // 2. 建立關聯的提醒設定
      const remindersToCreate = Array.isArray(remindAt) ? remindAt : [];
      const reminders = [];
      
      for (const time of remindersToCreate) {
        const reminder = await tx.reminder.create({
          data: {
            taskId: task.id,
            remindAt: new Date(time)
          }
        });
        reminders.push(reminder);
      }
      return { task, reminders };
    });

    // 3. 將每一個 Reminder 排入 Redis 任務佇列
    for (const reminder of result.reminders) {
      await scheduleNotification({
        taskId: result.task.id,
        reminderId: reminder.id,
        userId: userId
      }, new Date(reminder.remindAt));
    }

    res.status(201).json({ message: 'Task and reminders created successfully', data: result });
  } catch (error) {
    next(error);
  }
});

// 取得單一任務詳細資訊
router.get('/tasks/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: { reminders: true }
    });
    
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.status(200).json({ message: 'Task details fetched', task });
  } catch (error) {
    next(error);
  }
});

// 更新任務資料或狀態 (核心邏輯：攔截提醒)
router.patch('/tasks/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, title, description, priority, courseName, dueDate } = req.body;
    
    const dataToUpdate = {};
    if (status) dataToUpdate.status = status;
    if (title) dataToUpdate.title = title;
    if (description !== undefined) dataToUpdate.description = description;
    if (priority) dataToUpdate.priority = priority;
    if (courseName !== undefined) dataToUpdate.courseName = courseName;
    if (dueDate) dataToUpdate.dueDate = new Date(dueDate);

    const task = await prisma.task.update({
      where: { id },
      data: dataToUpdate
    });
    
    // 若 status 更新為 'COMPLETED'，Queue Worker 會在執行時自動略過發送 (無需手動從 Queue 移除)
    
    res.status(200).json({ message: 'Task updated successfully', task });
  } catch (error) {
    next(error);
  }
});

// 刪除任務
router.delete('/tasks/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    // 刪除任務 (因 DB Schema 有 Cascade，將自動刪除關聯的 Reminders)
    await prisma.task.delete({
      where: { id }
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * ==========================================
 * 提醒模組 (Reminders)
 * ==========================================
 */

// 為現有任務新增提醒時間
router.post('/tasks/:id/reminders', async (req, res, next) => {
  try {
    const { id: taskId } = req.params;
    const { remindAt } = req.body;
    
    if (!remindAt) {
       return res.status(400).json({ error: 'remindAt is required' });
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // 建立新的 Reminder 紀錄
    const reminder = await prisma.reminder.create({
      data: {
        taskId,
        remindAt: new Date(remindAt)
      }
    });

    // 將 Reminder 排入 Queue
    await scheduleNotification({
      taskId,
      reminderId: reminder.id,
      userId: task.userId
    }, new Date(reminder.remindAt));
    
    res.status(201).json({ message: 'Reminder added successfully', reminder });
  } catch (error) {
    next(error);
  }
});

// 刪除單一提醒設定
router.delete('/reminders/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.reminder.delete({
      where: { id }
    });
    // Worker 會在發送時檢查 Reminder 是否存在或已變更狀態，因此可以選擇不主動清除 Queue 內事件
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
