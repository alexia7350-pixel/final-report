from app import app
from models import db, User, Assignment, NotificationHistory
from datetime import datetime, timedelta

def seed_data():
    with app.app_context():
        # Clear existing tables to reset clean
        db.drop_all()
        db.create_all()
        
        print(">>> 資料庫表已重建完成。")
        
        # Create default test user
        user = User(
            username="student",
            email="your_email@gmail.com",
            line_token=None # Can be set manually in UI
        )
        user.set_password("student123")
        db.session.add(user)
        db.session.commit()
        
        print(f">>> 測試帳號建立成功！")
        print("    - 帳號名稱: student")
        print("    - 密碼: student123")
        
        now = datetime.now()
        
        # 1. Urgent Assignment (due in 2 hours and 30 minutes)
        ass1 = Assignment(
            user_id=user.id,
            title="課堂期末專案口頭報告投影片",
            course_name="系統分析與設計",
            deadline=now + timedelta(hours=2, minutes=30),
            remind_before_hours=24,
            description="需繳交 PDF 格式投影片至學校教學平台，並包含組員分工表與系統架構圖。",
            status="pending"
        )
        
        # 2. Upcoming Assignment (due in 3 days)
        ass2 = Assignment(
            user_id=user.id,
            title="資料庫 SQL 語法與交易實作作業三",
            course_name="資料庫系統",
            deadline=now + timedelta(days=3),
            remind_before_hours=12,
            description="完成第5章習題，並將 SQL 程式碼貼至 Word 回答問題。",
            status="pending"
        )
        
        # 3. Already Completed Assignment (due yesterday)
        ass3 = Assignment(
            user_id=user.id,
            title="演算法動態規劃 (DP) 課後練習題",
            course_name="演算法設計",
            deadline=now - timedelta(days=1),
            remind_before_hours=24,
            description="完成背包問題與最長共同子序列 (LCS) 題目撰寫。",
            status="completed"
        )
        
        db.session.add_all([ass1, ass2, ass3])
        db.session.commit()
        
        # Add a sample notification history for the completed assignment to populate the logs beautifully
        notif = NotificationHistory(
            assignment_id=ass3.id,
            triggered_at=now - timedelta(days=1, hours=2),
            status="success",
            message="⏰【截止提醒】\n作業「演算法動態規劃 (DP) 課後練習題」（科目：演算法設計）即將截止！\n截止時間：" + (now - timedelta(days=1)).strftime('%Y-%m-%d %H:%M') + "\n系統回饋：【模擬推送】已觸發通知：通知已發送至內置面板。"
        )
        db.session.add(notif)
        db.session.commit()
        
        print(">>> 3 筆測試用作業資料與 1 筆提醒通知日誌已成功寫入！")
        print("\n系統初始化完成！現在您可以執行 `python app.py` 啟動伺服器，並開啟瀏覽器訪問 `http://localhost:5000` 進行登入體驗。")

if __name__ == '__main__':
    seed_data()
