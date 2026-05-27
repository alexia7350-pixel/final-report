# 作業提醒管理系統 - API 路由設計文件與路由骨架

基於系統的架構 (Architecture)、流程 (Flowchart) 與資料庫設計 (DB Design)，以下為整合後的 API 路由設計規範，以及提供給後端 (Express.js + Prisma) 的路由骨架程式碼。

## 1. API 路由設計 (RESTful API Endpoints)

| 模組 | HTTP 方法 | 路由端點 (Endpoint) | 功能說明 | 權限/備註 |
| --- | --- | --- | --- | --- |
| **User** | `POST` | `/api/users` | 註冊 / 建立使用者 | 需提供 Email 或 LINE ID |
| **User** | `GET` | `/api/users/:id` | 取得使用者基本資料 | 需驗證身份 |
| **Task** | `GET` | `/api/tasks` | 取得使用者的所有任務列表 | 支援 `?status=PENDING` 等 Query 過濾 |
| **Task** | `POST` | `/api/tasks` | 建立新任務與設定提醒 | **核心**：同步建立 Reminder 並寫入 Queue |
| **Task** | `GET` | `/api/tasks/:id` | 取得單一任務詳細資訊 | 包含關聯的 Reminder 列表 |
| **Task** | `PATCH` | `/api/tasks/:id` | 更新任務資料或狀態 | **核心**：若狀態轉為 `COMPLETED`，背景 Worker 將自動攔截發送 |
| **Task** | `DELETE`| `/api/tasks/:id` | 刪除任務 | 觸發 Cascade Delete 刪除關聯的 Reminder |
| **Reminder**| `POST` | `/api/tasks/:id/reminders`| 為現有任務新增提醒時間 | 建立後需同步推入 Queue |
| **Reminder**| `DELETE`| `/api/reminders/:id` | 刪除單一提醒設定 | |

---

## 2. Request / Response 規格詳解

### 2.1 建立任務與提醒 (POST `/api/tasks`)
前端建立任務時，可同時傳遞多個提醒時間。後端將一併寫入 `Task` 與 `Reminder` 資料表，並將任務推入 Redis 排程佇列 (BullMQ)。

**Request Body**:
```json
{
  "userId": "uuid-string",
  "title": "軟體工程期末報告",
  "courseName": "軟體工程",
  "description": "需包含 UML 圖與 API 規格",
  "dueDate": "2026-06-15T23:59:00Z",
  "priority": "HIGH",
  "remindAt": [
    "2026-06-14T12:00:00Z", 
    "2026-06-15T12:00:00Z"
  ]
}
```

**Response (201 Created)**:
```json
{
  "message": "任務與排程建立成功",
  "data": {
    "taskId": "task-uuid",
    "reminders": [
      { "id": "rem1-uuid", "remindAt": "2026-06-14T12:00:00Z", "status": "PENDING" },
      { "id": "rem2-uuid", "remindAt": "2026-06-15T12:00:00Z", "status": "PENDING" }
    ]
  }
}
```

### 2.2 更新任務狀態 (PATCH `/api/tasks/:id`)
使用者完成作業後，前端呼叫此 API 變更狀態。狀態更新後，未來 Worker 執行到該任務的 Reminder 時，會因狀態為 `COMPLETED` 而取消推播 (根據 Flowchart 邏輯)。

**Request Body**:
```json
{
  "status": "COMPLETED"
}
```

**Response (200 OK)**:
```json
{
  "message": "任務狀態已更新",
  "data": {
    "id": "task-uuid",
    "status": "COMPLETED",
    "updatedAt": "2026-05-27T12:00:00Z"
  }
}
```

---

## 3. 路由骨架程式碼 (Express.js Skeleton)

以下程式碼基於 Express.js 與 Prisma 結構設計，可作為 `routes/api.js` 或主路由的基礎架構。

```javascript
// routes/api.js
const express = require('express');
const router = express.Router();

/**
 * ==========================================
 * 使用者模組 (Users)
 * ==========================================
 */

// 註冊/建立使用者
router.post('/users', async (req, res, next) => {
  try {
    const { email, name, lineId } = req.body;
    // TODO: 使用 Prisma 建立 User (prisma.user.create)
    res.status(201).json({ message: 'User created' });
  } catch (error) {
    next(error);
  }
});

// 取得使用者基本資料
router.get('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    // TODO: 查詢 User 資訊 (prisma.user.findUnique)
    res.status(200).json({ message: 'User details fetched' });
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
    // TODO: 根據 userId 與可選的 status 過濾條件查詢 Tasks (prisma.task.findMany)
    res.status(200).json({ message: 'List of tasks fetched' });
  } catch (error) {
    next(error);
  }
});

// 建立新任務與設定提醒 (核心邏輯)
router.post('/tasks', async (req, res, next) => {
  try {
    const { userId, title, courseName, description, dueDate, priority, remindAt } = req.body;
    
    // TODO: 1. 開啟 Database Transaction
    // TODO: 2. 建立新任務 (prisma.task.create)
    // TODO: 3. 根據 remindAt 陣列，批次建立 Reminder (prisma.reminder.createMany)
    // TODO: 4. 將每一個 Reminder 排入 Redis 任務佇列 (例如使用 BullMQ queue.add, 設定 delay)
    
    res.status(201).json({ message: 'Task and reminders created successfully' });
  } catch (error) {
    next(error);
  }
});

// 取得單一任務詳細資訊
router.get('/tasks/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    // TODO: 查詢 Task 並 include 關聯的 Reminders
    res.status(200).json({ message: 'Task details fetched' });
  } catch (error) {
    next(error);
  }
});

// 更新任務資料或狀態 (核心邏輯：攔截提醒)
router.patch('/tasks/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, title, description, priority } = req.body;
    
    // TODO: 1. 更新任務狀態 (prisma.task.update)
    // TODO: 2. 若 status 更新為 'COMPLETED'，這會使得未來 Queue 中的 Worker 在執行時自動略過發送
    
    res.status(200).json({ message: 'Task updated successfully' });
  } catch (error) {
    next(error);
  }
});

// 刪除任務
router.delete('/tasks/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    // TODO: 刪除任務 (因 DB Schema 有 Cascade，將自動刪除關聯的 Reminders)
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
    
    // TODO: 1. 建立新的 Reminder 紀錄
    // TODO: 2. 計算 delay 時間並推入 Queue
    
    res.status(201).json({ message: 'Reminder added successfully' });
  } catch (error) {
    next(error);
  }
});

// 刪除單一提醒設定
router.delete('/reminders/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    // TODO: 刪除 Reminder (prisma.reminder.delete)
    // TODO: (可選) 嘗試將 Queue 中尚未執行的該任務移除
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```
