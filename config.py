import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'homework-reminder-super-secret-key-12345'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///homework.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Mail Config (SMTP settings for Gmail)
    # These can be customized or loaded from environment variables
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME') or ''
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD') or ''
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER') or ''

    # LINE Notify OAuth config for local mock testing and absolute links
    LINE_CLIENT_ID = os.environ.get('LINE_CLIENT_ID') or 'mock_client_id'
    LINE_CLIENT_SECRET = os.environ.get('LINE_CLIENT_SECRET') or 'mock_client_secret'
    LINE_REDIRECT_URI = os.environ.get('LINE_REDIRECT_URI') or 'http://localhost:5000/auth/line/callback'
