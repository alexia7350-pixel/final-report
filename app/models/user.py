import sqlite3
from app.db import get_db

class UserSetting:
    """使用者設定 (UserSetting) 資料庫操作模型"""

    @staticmethod
    def get_all():
        """
        取得所有設定記錄
        :return: list of sqlite3.Row
        """
        try:
            db = get_db()
            return db.execute('SELECT * FROM settings').fetchall()
        except sqlite3.Error as e:
            print(f"Database error in UserSetting.get_all: {e}")
            return []
            
    @staticmethod
    def get_by_id(id):
        """
        取得單筆設定
        :param id: int
        :return: sqlite3.Row
        """
        try:
            db = get_db()
            return db.execute('SELECT * FROM settings WHERE id = ?', (id,)).fetchone()
        except sqlite3.Error as e:
            print(f"Database error in UserSetting.get_by_id: {e}")
            return None

    @staticmethod
    def update(id, data):
        """
        更新記錄 (標準 API)
        :param id: int
        :param data: dict
        :return: bool
        """
        if 'balance_threshold' in data:
            return UserSetting.update_threshold(data['balance_threshold'])
        return False

    @staticmethod
    def get_threshold():
        """
        取得餘額警示底線 (自訂業務邏輯)
        :return: float
        """
        try:
            db = get_db()
            setting = db.execute('SELECT balance_threshold FROM settings WHERE id = 1').fetchone()
            return setting['balance_threshold'] if setting else 0.0
        except sqlite3.Error as e:
            print(f"Database error in UserSetting.get_threshold: {e}")
            return 0.0

    @staticmethod
    def update_threshold(threshold):
        """
        更新餘額警示底線 (自訂業務邏輯)
        :param threshold: float
        :return: bool
        """
        try:
            db = get_db()
            db.execute(
                'UPDATE settings SET balance_threshold = ? WHERE id = 1',
                (threshold,)
            )
            db.commit()
            return True
        except sqlite3.Error as e:
            print(f"Database error in UserSetting.update_threshold: {e}")
            return False
