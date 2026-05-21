from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    line_token = db.Column(db.String(255), nullable=True) # LINE Notify access token
    
    assignments = db.relationship('Assignment', backref='user', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Assignment(db.Model):
    __tablename__ = 'assignments'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete="CASCADE"), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    course_name = db.Column(db.String(100), nullable=False)
    deadline = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='pending') # 'pending' or 'completed'
    description = db.Column(db.Text, nullable=True)
    remind_before_hours = db.Column(db.Integer, default=24) # e.g. 24 hours before
    
    notifications = db.relationship('NotificationHistory', backref='assignment', lazy=True, cascade="all, delete-orphan")

    @property
    def is_completed(self):
        return self.status == 'completed'

class NotificationHistory(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    assignment_id = db.Column(db.Integer, db.ForeignKey('assignments.id', ondelete="CASCADE"), nullable=False)
    triggered_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), nullable=False) # 'success' or 'failed'
    message = db.Column(db.Text, nullable=True)
