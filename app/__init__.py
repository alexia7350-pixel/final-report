from flask import Flask
from app.routes.main import main_bp
from app import db
import os

def create_app():
    app = Flask(__name__)
    app.secret_key = os.environ.get('SECRET_KEY', 'dev_secret_key')
    
    # 確保 instance 資料夾存在
    os.makedirs(app.instance_path, exist_ok=True)
    
    # 資料庫設定
    app.config['DATABASE'] = os.path.join(app.instance_path, 'database.db')
    
    # 初始化資料庫相關
    db.init_app(app)
    
    # 註冊 Blueprint
    app.register_blueprint(main_bp)
    
    return app
