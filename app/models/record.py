import sqlite3
from app.db import get_db

class Record:
    """收支紀錄 (Record) 資料庫操作模型"""
    
    @staticmethod
    def create(data):
        """
        新增一筆記錄
        :param data: dict，包含 type, amount, date, description
        :return: int, 新增記錄的 id，若發生錯誤回傳 None
        """
        try:
            db = get_db()
            cursor = db.execute(
                'INSERT INTO records (type, amount, date, description) VALUES (?, ?, ?, ?)',
                (data['type'], data['amount'], data['date'], data.get('description', ''))
            )
            db.commit()
            return cursor.lastrowid
        except sqlite3.Error as e:
            print(f"Database error in Record.create: {e}")
            return None

    @staticmethod
    def get_all(date=None):
        """
        取得所有記錄 (支援透過日期過濾)
        :param date: str，選填 (YYYY-MM-DD)
        :return: list of sqlite3.Row
        """
        try:
            db = get_db()
            if date:
                records = db.execute(
                    'SELECT * FROM records WHERE date = ? ORDER BY date DESC, id DESC',
                    (date,)
                ).fetchall()
            else:
                records = db.execute(
                    'SELECT * FROM records ORDER BY date DESC, id DESC'
                ).fetchall()
            return records
        except sqlite3.Error as e:
            print(f"Database error in Record.get_all: {e}")
            return []

    @staticmethod
    def get_by_id(id):
        """
        取得單筆記錄
        :param id: int
        :return: sqlite3.Row，找不到時回傳 None
        """
        try:
            db = get_db()
            record = db.execute(
                'SELECT * FROM records WHERE id = ?', (id,)
            ).fetchone()
            return record
        except sqlite3.Error as e:
            print(f"Database error in Record.get_by_id: {e}")
            return None

    @staticmethod
    def update(id, data):
        """
        更新記錄
        :param id: int
        :param data: dict，包含 type, amount, date, description
        :return: bool，更新成功與否
        """
        try:
            db = get_db()
            db.execute(
                'UPDATE records SET type = ?, amount = ?, date = ?, description = ? WHERE id = ?',
                (data['type'], data['amount'], data['date'], data.get('description', ''), id)
            )
            db.commit()
            return True
        except sqlite3.Error as e:
            print(f"Database error in Record.update: {e}")
            return False

    @staticmethod
    def delete(id):
        """
        刪除記錄
        :param id: int
        :return: bool，刪除成功與否
        """
        try:
            db = get_db()
            db.execute('DELETE FROM records WHERE id = ?', (id,))
            db.commit()
            return True
        except sqlite3.Error as e:
            print(f"Database error in Record.delete: {e}")
            return False

    @staticmethod
    def get_total_balance():
        """
        計算歷史總餘額 (自訂業務邏輯)
        :return: float
        """
        try:
            db = get_db()
            result = db.execute(
                "SELECT "
                "SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - "
                "SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total "
                "FROM records"
            ).fetchone()
            return result['total'] if result['total'] is not None else 0.0
        except sqlite3.Error as e:
            print(f"Database error in Record.get_total_balance: {e}")
            return 0.0
