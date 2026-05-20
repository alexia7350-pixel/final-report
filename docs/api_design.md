# 作業提醒管理系統 - API 路由設計文件 (API Design)

根據系統的產品需求 (PRD) 與資料庫設計 (DB Design)，以下是後端 RESTful API 的路由設計規範，以及使用 Express.js 撰寫的路由骨架 (Route Skeleton) 程式碼。

## 1. API 路由總覽 (RESTful API Endpoints)

| 模組 | 方法 | 路由端點 | 功能說明 | 備註 |
| --- | --- | --- | --- | --- |
| **User** | `POST` | `/api/users` | 註冊 / 建立使用者 | 需包含 Email 或 LINE ID |
| **User** | `GET` | `/api/users/:id` | 取得使用者基本資料 | |
| **Task** | `GET` | `/api/tasks` | 取得使用者的所有任務列表 | 支援狀態過濾 (如 `?status=PENDING`) |
| **Task** | `POST` | `/api/tasks` | 建立新任務與設定提醒 | 同步建立提醒排程 |
| **Task** | `GET` | `/api/tasks/:id` | 取得單一任務詳細資訊 | |
| **Task** | `PATCH`| `/api/tasks/:id` | 更新任務資料或狀態 | 核心功能：標記為「已完成」 |
| **Task** | `DELETE`|`/api/tasks/:id` | 刪除任務 | 級聯刪除關聯的提醒 |
| **Reminder**| `POST` | `/api/tasks/:id/reminders`| 為現有任務新增提醒時間 | |
| **Reminder**| `DELETE`|`/api/reminders/:id`| 刪除單一提醒設定 | |

## 2. Request / Response 規格範例

### 建立任務 (POST `/api/tasks`)
**Request Body**:
```json
{
  "userId": "user-uuid",
  "title": "軟體工程期末報告",
  "courseName": "軟體工程",
  "dueDate": "2026-06-15T23:59:00Z",
  "remindAt": ["2026-06-14T12:00:00Z", "2026-06-15T12:00:00Z"]
}
```
**Response (201 Created)**:
```json
{
  "message": "任務建立成功",
  "taskId": "task-uuid"
}
```

### 更新任務狀態 (PATCH `/api/tasks/:id`)
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
  "task": {
    "id": "task-uuid",
    "status": "COMPLETED"
  }
}
```

## 3. Express.js 路由骨架程式碼 (Route Skeleton)

以下是後端路由的骨架程式碼，可用於初始化後端專案的 `routes/index.js` 或 `routes/tasks.js`：

```javascript
// routes/api.js
const express = require('express');
const router = express.Router();

/**
 * ==============================
 * 使用者 (Users) 路由
 * ==============================
 */
router.post('/users', (req, res) => {
  // TODO: 建立使用者 (Email, Line ID)
  res.status(201).json({ message: 'User created' });
});

router.get('/users/:id', (req, res) => {
  // TODO: 取得使用者資料
  res.status(200).json({ message: 'User details' });
});

/**
 * ==============================
 * 任務 (Tasks) 路由
 * ==============================
 */
router.get('/tasks', (req, res) => {
  // TODO: 取得當前使用者的所有任務清單 (可支援 ?status 查詢參數)
  res.status(200).json({ message: 'List of tasks' });
});

router.post('/tasks', (req, res) => {
  // TODO: 1. 建立新任務 (Prisma Task.create)
  // TODO: 2. 建立關聯的提醒設定 (Prisma Reminder.create)
  // TODO: 3. 將提醒時間推入 Redis 任務佇列 (BullMQ)
  res.status(201).json({ message: 'Task created' });
});

router.get('/tasks/:id', (req, res) => {
  // TODO: 取得單一任務與其關聯的提醒詳細資訊
  res.status(200).json({ message: 'Task details' });
});

router.patch('/tasks/:id', (req, res) => {
  // TODO: 1. 更新任務狀態 (例如：切換未完成/已完成)
  // TODO: 2. 若狀態變更為 COMPLETED，背景發送 Worker 會在發送前自動攔截
  res.status(200).json({ message: 'Task updated' });
});

router.delete('/tasks/:id', (req, res) => {
  // TODO: 刪除任務 (資料庫設定 Cascade 會連同 Reminder 一併刪除)
  res.status(204).send();
});

/**
 * ==============================
 * 提醒 (Reminders) 路由
 * ==============================
 */
router.post('/tasks/:id/reminders', (req, res) => {
  // TODO: 針對特定任務新增提醒時間，並推入 Queue
  res.status(201).json({ message: 'Reminder added' });
});

router.delete('/reminders/:id', (req, res) => {
  // TODO: 刪除特定提醒設定 (若不需要該次提醒)
  res.status(204).send();
});

module.exports = router;
```
