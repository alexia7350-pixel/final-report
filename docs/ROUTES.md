# 路由與頁面設計文件 (API Design)

本文件根據產品規格 (PRD.md) 與系統流程 (FLOWCHART.md) 規劃 Flask 路由，並詳細說明每個 HTTP 端點的功能與對應模板。

## 1. 路由總覽表格

| 功能 | HTTP 方法 | URL 路徑 | 對應模板 | 說明 |
| --- | --- | --- | --- | --- |
| 儀表板首頁 | GET | `/` | `templates/index.html` | 顯示當日收支明細與目前的總餘額 |
| 新增紀錄 | POST | `/add` | — (重導向至 `/`) | 接收新增收支表單，儲存至資料庫 |
| 刪除紀錄 | POST | `/delete/<int:id>` | — (重導向至前一頁) | 刪除單筆收支明細，刪除後重新計算餘額 |
| 歷史紀錄 | GET | `/history` | `templates/history.html` | 顯示依日期過濾的歷史紀錄 |
| 設定頁面 | GET | `/settings` | `templates/settings.html` | 顯示警示餘額底線設定表單 |
| 更新設定 | POST | `/settings` | — (重導向至 `/`) | 接收警示餘額底線設定，儲存至資料庫 |

---

## 2. 路由詳細說明

### 2.1 儀表板首頁
- **URL 路徑**：`/`
- **HTTP 方法**：GET
- **輸入 (Parameters)**：無
- **處理邏輯**：
  1. 呼叫 Record Model 取得「當日」的所有收支紀錄。
  2. 呼叫 Record Model 取得「歷史以來的總餘額」。
  3. 呼叫 User Model 取得「餘額警示底線」。
- **輸出 (Response)**：渲染 `templates/index.html`，傳入當日明細清單、總餘額、餘額底線。

### 2.2 新增紀錄
- **URL 路徑**：`/add`
- **HTTP 方法**：POST
- **輸入 (Form Data)**：
  - `type`: 'income' 或是 'expense'
  - `amount`: 數字 (大於 0)
  - `date`: 日期字串 (YYYY-MM-DD，若空預設為今日)
  - `description`: 字串，備註說明 (可選)
- **處理邏輯**：
  1. 驗證 `amount` 與 `type` 是否合法。
  2. 呼叫 Record Model 的 `create()` 新增該筆紀錄。
- **輸出 (Response)**：處理完畢後，發出 302 Redirect 回首頁 `/`。
- **錯誤處理**：若必填資料缺少或錯誤，提示錯誤訊息並導回首頁。

### 2.3 刪除紀錄
- **URL 路徑**：`/delete/<int:id>`
- **HTTP 方法**：POST
- **輸入 (URL 參數)**：要刪除的紀錄 `id`
- **處理邏輯**：
  1. 驗證該筆 `id` 紀錄是否存在。
  2. 呼叫 Record Model 的 `delete()` 刪除該筆資料。
- **輸出 (Response)**：刪除後重新導向至發出請求的上一頁 (可能是 `/` 或是 `/history`)。
- **錯誤處理**：如果找不到 `id` 則回傳 404 Not Found。

### 2.4 歷史紀錄
- **URL 路徑**：`/history`
- **HTTP 方法**：GET
- **輸入 (Query Parameters)**：
  - `date`: 日期字串 (YYYY-MM-DD，可選。若未提供則不額外過濾特定日期)
- **處理邏輯**：
  1. 若有 `date` 參數，呼叫 Record Model 取得特定日期的資料；否則取得最近 N 筆 或全量資料。
- **輸出 (Response)**：渲染 `templates/history.html` 並傳送資料物件陣列給畫面渲染。

### 2.5 設定頁面
- **URL 路徑**：`/settings`
- **HTTP 方法**：GET
- **輸入 (Parameters)**：無
- **處理邏輯**：
  1. 呼叫 User Model 取得目前系統設定的 `balance_threshold`（預設可能為 0）。
- **輸出 (Response)**：渲染 `templates/settings.html` 並回填表單預設值。

### 2.6 更新設定
- **URL 路徑**：`/settings`
- **HTTP 方法**：POST
- **輸入 (Form Data)**：
  - `balance_threshold`: 數字
- **處理邏輯**：
  1. 驗證傳入值為合法數值。
  2. 呼叫 User Model 的 `update()` 儲存新的底線。
- **輸出 (Response)**：重新導向回首頁 `/`，或是更新成功後的設定頁面。

---

## 3. Jinja2 模板清單

所有的模板將放置在 `app/templates/` 且依賴基礎模板進行版面繼承配置。

| 模板檔案路徑 | 繼承對象 | 模板職責 |
| --- | --- | --- |
| `base.html` | 無 | 提供共用 head、外部樣式表引入、網站 Navbar 與 Footer |
| `index.html` | `base.html` | 呈現今日收支明細表、餘額剩餘顯示區、新增收支表單框 |
| `history.html` | `base.html` | 提供日期過濾器及以表格條列所有條件內的明細紀錄 |
| `settings.html` | `base.html` | 提供警示額度的表單修改介面 |
