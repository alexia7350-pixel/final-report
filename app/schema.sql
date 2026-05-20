DROP TABLE IF EXISTS records;
DROP TABLE IF EXISTS settings;

CREATE TABLE records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,          -- 'income' 或 'expense'
    amount REAL NOT NULL,
    date TEXT NOT NULL,          -- YYYY-MM-DD
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE settings (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- 保證只有一筆設定
    balance_threshold REAL NOT NULL DEFAULT 0.0
);

-- 初始化第一筆設定
INSERT INTO settings (id, balance_threshold) VALUES (1, 0.0);
